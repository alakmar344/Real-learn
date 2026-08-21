import { getDb } from "../lib/mongodb.js";
import { createRateLimiter } from "../lib/rateLimit.js";

const feedbackRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  ipMultiplier: 2,
});

export async function feedbackHandler(req, res) {
  const send = (status, payload) => {
    if (res.code && typeof res.code === "function") {
      return res.code(status).send(payload);
    }
    if (res.status && typeof res.status === "function") {
      return res.status(status).json(payload);
    }
  };

  try {
    const { rating, likes, improvements } = req.body ?? {};

    const numRating =
      typeof rating === "number" && Number.isFinite(rating) ? Math.round(rating) : null;
    if (!numRating || numRating < 1 || numRating > 10) {
      return send(400, { error: "A star rating from 1 to 10 is required." });
    }

    const cleanText = (v) =>
      typeof v === "string" ? v.trim().slice(0, 1000) : "";
    const likesText = cleanText(likes);
    const improvementsText = cleanText(improvements);

    const db = await getDb();
    await db.collection("feedback").insertOne({
      rating: numRating,
      likes: likesText,
      improvements: improvementsText,
      createdAt: new Date(),
    });

    console.log("[api/feedback] Anonymous review received", { rating: numRating });

    return send(200, { ok: true });
  } catch (error) {
    console.error("[api/feedback] Failed to store feedback", error);
    return send(500, { error: "Failed to save feedback" });
  }
}

const feedbackResponseSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
        },
      },
    },
  },
};

export default async function feedbackRoutes(fastify) {
  fastify.post(
    "/api/feedback",
    { preHandler: [feedbackRateLimiter], ...feedbackResponseSchema },
    feedbackHandler
  );
}
