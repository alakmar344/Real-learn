import express from "express";
import { getDb } from "../lib/mongodb.js";
import { createRateLimiter } from "../lib/rateLimit.js";

const router = express.Router();

// SECURITY: /api/feedback is the only UNAUTHENTICATED MongoDB writer, so it
// gets its own much tighter budget than the general API limiter. A real user
// submits at most one review; 5/min per caller (10/min per IP) caps junk-
// insertion storage abuse while never touching legitimate use.
const feedbackRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  ipMultiplier: 2,
});

// Store an OPTIONAL user review/feedback. This endpoint is intentionally
// PUBLIC (no requireAuth) and stores NO identifiers: no Clerk ID, no email, and
// no client IP. We only persist the anonymized review fields the user chose to
// submit. This matches the product's privacy promise that feedback is stripped
// of any identity before it is sent (see frontend/lib/feedback.ts and the
// Privacy Policy's feedback disclosure).
router.post("/api/feedback", feedbackRateLimiter, async (req, res) => {
  try {
    const { rating, likes, improvements } = req.body ?? {};

    // Validate: a star rating (1–10) is required; free-text fields are
    // optional but bounded. Nothing else is accepted.
    const numRating =
      typeof rating === "number" && Number.isFinite(rating) ? Math.round(rating) : null;
    if (!numRating || numRating < 1 || numRating > 10) {
      return res.status(400).json({ error: "A star rating from 1 to 10 is required." });
    }

    const cleanText = (v) =>
      typeof v === "string" ? v.trim().slice(0, 1000) : "";
    const likesText = cleanText(likes);
    const improvementsText = cleanText(improvements);

    const db = await getDb();
    await db.collection("feedback").insertOne({
      // Privacy: only the anonymous review payload. We deliberately do NOT add
      // clerkId, email, or deviceIp — this record must not be linkable to a
      // person. (req.ip is never read here by design.)
      rating: numRating,
      likes: likesText,
      improvements: improvementsText,
      createdAt: new Date(),
    });

    // Privacy: log nothing identifying — not even that a specific user sent it.
    console.log("[api/feedback] Anonymous review received", { rating: numRating });

    return res.json({ ok: true });
  } catch (error) {
    console.error("[api/feedback] Failed to store feedback", error);
    return res.status(500).json({ error: "Failed to save feedback" });
  }
});

// NOTE: The standalone "Find" discovery endpoint (/api/find) was removed when
// the Find feature became an internal, quiz-driven personalization layer. The
// learner's mastery graph is now computed on-device (frontend/lib/
// knowledgeFrontier.ts + learningProfile.ts) and a compact, topic-relevant
// context snippet is attached to each /api/generate-lesson request instead of
// being surfaced on a separate page. The lesson full-text index that backed it
// was retired along with the route (see startup/migrations.js).

export default router;
