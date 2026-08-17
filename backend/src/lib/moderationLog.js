import { getDb } from "./mongodb.js";

// ── Moderation log retention (privacy / data-minimization) ──
// Moderation logs auto-expire via a MongoDB TTL index so flagged-content
// records are never kept longer than needed for abuse prevention. This TTL
// applies ONLY to moderationLogs: the "agreements" collection (consent
// records) is deliberately permanent — it is the legal proof of consent and
// is only removed by account deletion (DELETE /api/account).
const DEFAULT_MODERATION_LOG_TTL_DAYS = 90;
const configuredModerationLogTtlDays = Number(process.env.MODERATION_LOG_TTL_DAYS);
const MODERATION_LOG_TTL_DAYS =
  Number.isFinite(configuredModerationLogTtlDays) && configuredModerationLogTtlDays > 0
    ? configuredModerationLogTtlDays
    : DEFAULT_MODERATION_LOG_TTL_DAYS;
const MODERATION_LOG_TTL_SECONDS = Math.round(MODERATION_LOG_TTL_DAYS * 24 * 60 * 60);
// The logged copy of the user's question is capped — enough to understand
// what was flagged, without storing arbitrarily large content.
const MODERATION_LOG_QUESTION_MAX_CHARS = 500;
const MODERATION_LOG_TTL_INDEX_NAME = "moderationLogTtl";

let moderationLogIndexPromise = null;
function ensureModerationLogTtlIndex(db) {
  if (moderationLogIndexPromise) return moderationLogIndexPromise;
  moderationLogIndexPromise = (async () => {
    const collection = db.collection("moderationLogs");
    try {
      await collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: MODERATION_LOG_TTL_SECONDS, name: MODERATION_LOG_TTL_INDEX_NAME }
      );
    } catch (error) {
      // Index exists with a different TTL (IndexOptionsConflict) — recreate
      // it so a changed MODERATION_LOG_TTL_DAYS takes effect.
      if (error?.code === 85 || error?.codeName === "IndexOptionsConflict") {
        await collection.dropIndex(MODERATION_LOG_TTL_INDEX_NAME);
        await collection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: MODERATION_LOG_TTL_SECONDS, name: MODERATION_LOG_TTL_INDEX_NAME }
        );
      } else {
        throw error;
      }
    }
    // Backfill: legacy events only carried an ISO-string `timestamp`, which a
    // TTL index cannot expire. Give them a real `createdAt` Date so old
    // flagged-content records age out under the same retention window.
    await collection.updateMany(
      { createdAt: { $exists: false }, timestamp: { $type: "string" } },
      [{ $set: { createdAt: { $toDate: "$timestamp" } } }]
    );
    console.log(
      `[moderation] moderationLogs TTL index ensured (${MODERATION_LOG_TTL_DAYS} days)`
    );
  })().catch((error) => {
    // Allow a later log call to retry index creation.
    moderationLogIndexPromise = null;
    console.error("[moderation] Failed to ensure moderationLogs TTL index", error);
  });
  return moderationLogIndexPromise;
}

// Builds the record that lands in moderationLogs. The log answers two
// questions — WHAT was flagged (reason + type) and WHICH user query triggered
// it — rather than storing internal error text. Kept intentionally minimal:
// pseudonymous Clerk ID only (no email/IP/UA), question capped in length,
// auto-deleted by the TTL index above.
export function buildModerationEvent({ requestId, clerkId, type, reason, question }) {
  const now = new Date();
  return {
    timestamp: now.toISOString(),
    createdAt: now, // BSON Date — required for the TTL index.
    requestId,
    clerkId: clerkId || null,
    type,
    // What the filter/classifier flagged (user-facing reason, never an
    // internal error message or stack trace).
    flaggedReason:
      typeof reason === "string" && reason.trim()
        ? reason.trim()
        : "Content flagged by safety review",
    // The user query that triggered the flag (capped for data minimization).
    question:
      typeof question === "string"
        ? question.slice(0, MODERATION_LOG_QUESTION_MAX_CHARS)
        : null,
  };
}

// Privacy: the moderation record persisted to Mongo carries the user's
// question, but it is protected by the TTL index and erased on account
// deletion. Process stdout logs are a SEPARATE sink those controls never
// reach (and on most PaaS are retained independently), so the question must
// never be written there. Strip it before any console logging.
export function redactModerationEvent(event) {
  const { question, ...rest } = event;
  return { ...rest, question: question ? "[redacted]" : null };
}

export async function logModerationEvent(event) {
  try {
    const db = await getDb();
    await ensureModerationLogTtlIndex(db);
    await db.collection("moderationLogs").insertOne(event);
  } catch (error) {
    console.error("[moderation] Failed to log moderation event", error);
  }
}
