// Consent, account-deletion, and data-export routes. They share the same
// pattern: identity is ALWAYS the verified clerkId from the token, client IPs
// are anonymized (lib/privacy.js) and User-Agents hashed before storage.
import express from "express";
import { getDb } from "../lib/mongodb.js";
import { requireAuth, getAuthEmail } from "../lib/auth.js";
import { anonymizeIp, hashUserAgent } from "../lib/privacy.js";
import { apiRateLimiter } from "../lib/rateLimit.js";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
  COOKIE_POLICY_VERSION,
} from "../config.js";

const router = express.Router();
const rateLimit = apiRateLimiter;

router.post("/api/agreement", rateLimit, requireAuth, async (req, res) => {
  try {
    const { accepted, timestamp } = req.body;

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) is required" });
    }

    // Validate the client-supplied timestamp; fall back to the server clock.
    // (A previous refactor referenced `parsedTimestamp` without defining it
    // here, which made every call to this endpoint throw a ReferenceError and
    // return 500 — cookie-consent records were silently never persisted.)
    const parsedTimestamp = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(parsedTimestamp.getTime())) {
      return res.status(400).json({ error: "A valid timestamp is required" });
    }

    // Security (IDOR fix): the clerkId is ALWAYS taken from the verified
    // token, never from the request body — otherwise any signed-in user
    // could overwrite any other user's consent record.
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }
  const db = await getDb();
  const collection = db.collection("agreements");

  const filter = { clerkId, type: "cookie-consent" };
  const update = {
    $set: {
      accepted,
      clerkId,
        // Privacy (policy v2.3): store only the anonymized network prefix,
        // never the full client IP (see anonymizeIp above).
        deviceIp: anonymizeIp(req.ip || req.socket?.remoteAddress || ""),
        // Privacy (GDPR data minimization): hash the User-Agent so we can
        // detect repeat-device fraud without storing raw fingerprintable
        // strings. The hash is salted with a per-process secret so it can't
        // be reversed by rainbow-table lookup.
        userAgent: hashUserAgent(req.headers["user-agent"]),
        timestamp: parsedTimestamp,
        privacyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        cookieVersion: COOKIE_POLICY_VERSION,
        updatedAt: new Date(),
      },
      // Privacy (policy v3.2): consent records must NOT contain the email —
      // it lives only with Clerk, our authentication provider. The record is
      // keyed to the verified clerkId, which is all deletion/export need.
      // $unset also scrubs the legacy fields off any pre-v3.2 record the
      // next time the user re-consents.
      $unset: { email: "", emailVerified: "", emailSource: "" },
      $setOnInsert: {
        type: "cookie-consent",
        createdAt: new Date(),
      },
    };

  await collection.updateOne(filter, update, { upsert: true });
    // Privacy: don't log email addresses.
    console.log("[api/agreement] Consent saved", { clerkId, accepted });

    res.json({ ok: true });
  } catch (error) {
    console.error("[api/agreement] Failed to save consent", error);
    res.status(500).json({ error: "Failed to save consent" });
  }
});

// Get the user's current cookie/analytics consent status.
// For signed-in users the server-side record is the source of truth — it
// survives a device change, a cookie/localStorage wipe, or a re-login, and is
// what the frontend queries FIRST (anonymous visitors have no server record
// and fall back to localStorage). Returning the stored cookieVersion lets the
// client re-prompt when the cookie policy is bumped.
router.get("/api/agreement/status", rateLimit, requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }

    const db = await getDb();
    const agreement = await db
      .collection("agreements")
      .findOne({ clerkId, type: "cookie-consent" });

    if (agreement) {
      res.setHeader("Cache-Control", "private, max-age=300");
      res.json({
        accepted: agreement.accepted,
        cookieVersion: agreement.cookieVersion || null,
      });
    } else {
      res.setHeader("Cache-Control", "private, max-age=60");
      res.json({ accepted: false });
    }
  } catch (error) {
    console.error("[api/agreement/status] Failed to fetch status", error);
    res.status(500).json({ error: "Failed to fetch consent status" });
  }
});

// Delete every server-side trace of the authenticated user: their MongoDB
// cookie-consent records AND their Clerk account. The frontend handles clearing
// localStorage and signing out after this resolves. Irreversible by design.
router.delete("/api/account", rateLimit, requireAuth, async (req, res) => {
  const userId = req.auth?.userId;
  const email = getAuthEmail(req.auth);
  console.log("[api/account] Delete request", { userId, hasEmail: Boolean(email) });

  if (!userId) {
    return res.status(400).json({ error: "Could not determine the user to delete." });
  }

  // PRIVACY / PERFORMANCE: tag JSON responses with Vary so shared caches (CDNs,
  // proxies) key on the accepted encoding. Without this, a client that receives
  // a gzip/brotli response could leak a compressed body to a peer that only
  // speaks plain text.
  if (!res.getHeader("Vary")) {
    res.setHeader("Vary", "Accept-Encoding");
  }
  let agreementsDeleted = 0;
  let moderationLogsDeleted = 0;
  try {
    const db = await getDb();
    const filter = userId ? { clerkId: userId } : {};
    // PERFORMANCE: delete both collections SIMULTANEOUSLY instead of waiting
    // for one to finish before starting the other. Promise.allSettled ensures
    // one failure doesn't crash the other.
    const [agreementsResult, modResult] = await Promise.allSettled([
      db.collection("agreements").deleteMany(filter),
      db.collection("moderationLogs").deleteMany(filter),
    ]);
    // NOTE: anonymous feedback records carry no clerkId, so account deletion
    // cannot (and need not) remove them — they were never linked to the user.
    agreementsDeleted = agreementsResult.status === "fulfilled" ? agreementsResult.value.deletedCount ?? 0 : 0;
    moderationLogsDeleted = modResult.status === "fulfilled" ? modResult.value.deletedCount ?? 0 : 0;
    if (agreementsResult.status === "rejected") {
      console.error("[api/account] Failed to delete agreements", agreementsResult.reason);
    }
    if (modResult.status === "rejected") {
      console.error("[api/account] Failed to delete moderationLogs", modResult.reason);
    }
    console.log("[api/account] Mongo data deleted", { userId, agreementsDeleted, moderationLogsDeleted });
  } catch (error) {
    console.error("[api/account] Failed to delete Mongo data", error);
    return res.status(500).json({ error: "Failed to delete your stored data." });
  }

  // Delete the Clerk account via the Clerk Backend API.
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[api/account] CLERK_SECRET_KEY is not configured");
    return res.status(500).json({
      error:
        "Account deletion is not configured on the server. Your stored data was removed, but the account could not be deleted.",
    });
  }

  try {
    const apiBase = (process.env.CLERK_API_URL || "https://api.clerk.com").replace(/\/$/, "");
    const clerkRes = await fetch(`${apiBase}/v1/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secret}` },
      // A hung Clerk API must not stall this request for minutes after the
      // Mongo data is already gone; the catch below maps timeouts to the 502.
      signal: AbortSignal.timeout(10_000),
    });

    if (!clerkRes.ok) {
      const payload = await clerkRes.text().catch(() => "");
      console.error("[api/account] Clerk deletion failed", {
        userId,
        status: clerkRes.status,
        payload: payload.slice(0, 500),
      });
      return res.status(502).json({
        error: "Your stored data was removed, but the account could not be deleted. Please try again.",
      });
    }

    console.log("[api/account] Clerk account deleted", { userId });
    return res.json({ ok: true, agreementsDeleted, moderationLogsDeleted, clerkDeleted: true });
  } catch (error) {
    console.error("[api/account] Clerk deletion error", error);
    return res.status(502).json({
      error: "Your stored data was removed, but the account could not be deleted. Please try again.",
    });
  }
});

// Store the user's legal consent (Privacy Policy + Terms of Service) acceptance.
// This is called after the user accepts the pre-sign-in consent and signs in.
router.post("/api/legal-consent", rateLimit, requireAuth, async (req, res) => {
  try {
    const { accepted, timestamp } = req.body;

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) is required" });
    }
    // Validate the timestamp is an actual parseable date — otherwise an
    // Invalid Date is silently persisted.
    const parsedTimestamp = timestamp ? new Date(timestamp) : null;
    if (!parsedTimestamp || Number.isNaN(parsedTimestamp.getTime())) {
      return res.status(400).json({ error: "A valid timestamp is required" });
    }
    // Privacy: store only the age bracket, not any exact date of birth.
    const ageBracket = req.body?.ageBracket;
    const validAgeBrackets = new Set(["under13", "13-17", "18+"]);
    const sanitizedAgeBracket =
      typeof ageBracket === "string" && validAgeBrackets.has(ageBracket)
        ? ageBracket
        : null;

    const db = await getDb();
    const collection = db.collection("agreements");
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }
    const filter = { clerkId, type: "legal-consent" };
    const update = {
      $set: {
        accepted,
        clerkId,
        ageBracket: sanitizedAgeBracket,
        // Privacy (policy v2.3): store only the anonymized network prefix,
        // never the full client IP (see anonymizeIp above).
        deviceIp: anonymizeIp(req.ip || req.socket?.remoteAddress || ""),
        // Privacy (GDPR data minimization): hash the User-Agent so we can
        // detect repeat-device fraud without storing raw fingerprintable
        // strings. The hash is salted with a per-process secret so it can't
        // be reversed by rainbow-table lookup.
        userAgent: hashUserAgent(req.headers["user-agent"]),
        timestamp: parsedTimestamp,
        type: "legal-consent",
        privacyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        updatedAt: new Date(),
      },
      // Privacy (policy v3.2): consent records must NOT contain the email —
      // it lives only with Clerk. $unset scrubs the legacy fields off any
      // pre-v3.2 record the next time the user re-consents.
      $unset: { email: "", emailVerified: "", emailSource: "" },
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

await collection.updateOne(filter, update, { upsert: true });
    // Security: log the PARSED timestamp, not the raw client string —
    // unsanitized client input has no business in structured logs.
    console.log("[api/legal-consent] Legal consent saved", {
      clerkId,
      accepted,
      timestamp: parsedTimestamp,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("[api/legal-consent] Failed to save legal consent", error);
    res.status(500).json({ error: "Failed to save legal consent" });
  }
});

// Get the user's current legal consent status.
router.get("/api/legal-consent/status", rateLimit, requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }

    const db = await getDb();
    const agreement = await db.collection("agreements").findOne({ clerkId, type: "legal-consent" });

    if (agreement) {
      res.setHeader("Cache-Control", "private, max-age=300");
      res.json({
        accepted: agreement.accepted,
        privacyVersion: agreement.privacyVersion,
        termsVersion: agreement.termsVersion,
      });
    } else {
      res.setHeader("Cache-Control", "private, max-age=60");
      res.json({ accepted: false });
    }
  } catch (error) {
    console.error("[api/legal-consent/status] Failed to fetch status", error);
    res.status(500).json({ error: "Failed to fetch legal consent status" });
  }
});

// Export all user data from MongoDB as JSON.
router.get("/api/export-data", rateLimit, requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const email = getAuthEmail(req.auth);

    if (!userId) {
      return res.status(400).json({ error: "Could not determine the user." });
    }

    const db = await getDb();
    // Security: match strictly on the verified clerkId. Matching on email as
    // well would let a record created by another account (with a spoofed or
    // shared email) leak into this user's export.
    const filter = { clerkId: userId };

    // Completeness (GDPR Art. 15 / DPDP access right): the export must cover
    // EVERY collection that stores data keyed to this user — consent records
    // AND moderation logs.
    // Bound memory: a user's own records only, but cap the result size so a
    // pathological history cannot balloon one request into an unbounded array.
    const EXPORT_DOC_CAP = 10_000;
    const [agreements, moderationLogs] = await Promise.all([
      db.collection("agreements").find(filter).limit(EXPORT_DOC_CAP).toArray(),
      db.collection("moderationLogs").find(filter).limit(EXPORT_DOC_CAP).toArray(),
    ]);

    res.setHeader("Content-Type", "application/json");
    // Security: `sub` is only Clerk-shaped for OUR issuer — a token minted on
    // an allowlisted dev issuer controls it fully, so keep header-safe chars
    // only (quotes/control bytes must never reach Content-Disposition).
    const safeFilenameId = String(userId).replace(/[^\w.-]/g, "_").slice(0, 64);
    res.setHeader("Content-Disposition", `attachment; filename="reallearn-data-${safeFilenameId}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      user: {
        clerkId: userId,
        email,
      },
      agreements,
      moderationLogs,
    });
  } catch (error) {
    console.error("[api/export-data] Failed to export data", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
