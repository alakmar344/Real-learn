// Startup background maintenance: one-time privacy migrations over legacy
// records and index ensurers for the per-user query paths. Everything here is
// fire-and-forget from the listen callback; failures are logged, never fatal.
import { getDb } from "../lib/mongodb.js";
import { anonymizeIp } from "../lib/privacy.js";
import { ensureLessonCacheIndexes } from "../lib/lessonCache.js";
import { ensureModerationLogTtlIndex } from "../lib/moderationLog.js";

// One-time cleanup (policy v2.3): earlier releases stored the RAW client IP
// in consent records. Retroactively anonymize every stored deviceIp so no
// full IP address remains anywhere in the agreements collection. Runs in the
// background at startup; safe to run repeatedly (already-anonymized values
// re-anonymize to themselves and are skipped).
// One-time-migration bookkeeping. The consent scrubs below are correctness-safe
// to re-run, but each does an unindexed full scan of the `agreements`
// collection, so re-running on every boot means every restart pays a scan that
// grows with the collection. A tiny sentinel in `migrations` lets a completed
// migration no-op on subsequent boots (new writes are already clean at source).
async function isMigrationComplete(db, id) {
  try {
    return Boolean(await db.collection("migrations").findOne({ _id: id }));
  } catch {
    return false;
  }
}

async function markMigrationComplete(db, id) {
  try {
    await db.collection("migrations").updateOne(
      { _id: id },
      { $setOnInsert: { completedAt: new Date() } },
      { upsert: true }
    );
  } catch {
    // Non-fatal: worst case the migration runs (harmlessly) again next boot.
  }
}

export async function scrubStoredConsentIps() {
  try {
    const db = await getDb();
    if (await isMigrationComplete(db, "scrub-consent-ips-v1")) return;
    const collection = db.collection("agreements");
    const cursor = collection.find(
      { deviceIp: { $type: "string", $nin: ["", "unknown"] } },
      { projection: { deviceIp: 1 } }
    );
    let scrubbed = 0;
    // Batch updates via bulkWrite instead of one round-trip per record.
    let ops = [];
    const flush = async () => {
      if (ops.length === 0) return;
      await collection.bulkWrite(ops, { ordered: false });
      scrubbed += ops.length;
      ops = [];
    };
    for await (const doc of cursor) {
      const anonymized = anonymizeIp(doc.deviceIp);
      if (anonymized === doc.deviceIp) continue;
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { deviceIp: anonymized } },
        },
      });
      if (ops.length >= 500) await flush();
    }
    await flush();
    if (scrubbed > 0) {
      console.log(`[privacy] Anonymized stored IPs on ${scrubbed} legacy consent record(s)`);
    }
    await markMigrationComplete(db, "scrub-consent-ips-v1");
  } catch (error) {
    // Non-fatal: the scrub retries on next boot; new writes are already
    // anonymized at the source.
    console.error("[privacy] Failed to scrub legacy consent IPs", error?.message);
  }
}

// One-time cleanup (policy v3.2): earlier releases stored the verified Clerk
// email (plus emailVerified/emailSource) on consent records, contradicting
// the Privacy Policy statement that the email address is held only by Clerk.
// Retroactively remove the fields from every record; new writes no longer
// include them (and actively $unset them). Runs in the background at
// startup; safe to run repeatedly (a no-op once the fields are gone).
export async function scrubStoredConsentEmails() {
  try {
    const db = await getDb();
    if (await isMigrationComplete(db, "scrub-consent-emails-v1")) return;
    const collection = db.collection("agreements");
    const result = await collection.updateMany(
      {
        $or: [
          { email: { $exists: true } },
          { emailVerified: { $exists: true } },
          { emailSource: { $exists: true } },
        ],
      },
      { $unset: { email: "", emailVerified: "", emailSource: "" } }
    );
    if (result.modifiedCount > 0) {
      console.log(
        `[privacy] Removed stored email fields from ${result.modifiedCount} legacy consent record(s)`
      );
    }
    await markMigrationComplete(db, "scrub-consent-emails-v1");
  } catch (error) {
    // Non-fatal: the scrub retries on next boot; new writes no longer
    // persist the email at the source.
    console.error("[privacy] Failed to scrub legacy consent emails", error?.message);
  }
}

// PERFORMANCE/SECURITY (DoS hardening): every consent lookup/upsert, data
// export, and account deletion filters on clerkId (+ type). Without indexes
// those are full collection scans, which get slower — and cheaper to
// weaponize via the authenticated status endpoints — as the collections grow.
// Runs in the background at startup; failures are non-fatal (queries still
// work, just unindexed until the next boot retries).
// Anonymous feedback ages out via TTL so the one unauthenticated Mongo writer
// (/api/feedback) can't grow storage without bound under distributed spam.
const DEFAULT_FEEDBACK_TTL_DAYS = 730;
const configuredFeedbackTtlDays = Number(process.env.FEEDBACK_TTL_DAYS);
const FEEDBACK_TTL_DAYS =
  Number.isFinite(configuredFeedbackTtlDays) && configuredFeedbackTtlDays > 0
    ? configuredFeedbackTtlDays
    : DEFAULT_FEEDBACK_TTL_DAYS;
const FEEDBACK_TTL_SECONDS = Math.round(FEEDBACK_TTL_DAYS * 24 * 60 * 60);
const FEEDBACK_TTL_INDEX_NAME = "feedbackTtl";

async function ensureFeedbackTtlIndex(db) {
  const collection = db.collection("feedback");
  try {
    await collection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: FEEDBACK_TTL_SECONDS, name: FEEDBACK_TTL_INDEX_NAME }
    );
  } catch (error) {
    // Index exists with a different TTL — recreate so a changed
    // FEEDBACK_TTL_DAYS takes effect (same pattern as moderationLogs).
    if (error?.code === 85 || error?.codeName === "IndexOptionsConflict") {
      await collection.dropIndex(FEEDBACK_TTL_INDEX_NAME);
      await collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: FEEDBACK_TTL_SECONDS, name: FEEDBACK_TTL_INDEX_NAME }
      );
    } else {
      throw error;
    }
  }
}

export async function ensureUserDataIndexes() {
  try {
    const db = await getDb();
    await Promise.all([
      db.collection("agreements").createIndex({ clerkId: 1, type: 1 }),
      db.collection("moderationLogs").createIndex({ clerkId: 1 }),
      // Build the moderationLogs TTL index (+ legacy backfill) at startup so the
      // FIRST flagged request no longer pays for createIndex/backfill inline.
      ensureModerationLogTtlIndex(db),
      db.collection("feedback").createIndex({ createdAt: -1 }),
      ensureFeedbackTtlIndex(db),
      ensureLessonCacheIndexes(db),
    ]);
    console.log(
      `[startup] User-data and lesson-cache indexes ensured (feedback TTL ${FEEDBACK_TTL_DAYS} days)`
    );
  } catch (error) {
    console.error("[startup] Failed to ensure user-data indexes", error?.message);
  }
}
