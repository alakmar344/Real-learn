// Two-tier lesson cache — a speed tactic that makes repeat questions instant.
//
// Tier 1: in-memory LRU — sub-millisecond hits on this instance.
// Tier 2: MongoDB with a TTL index — survives restarts and is shared across
//         instances, so any server in the fleet benefits from any other's work.
//
// A cached lesson was already moderated (local rule-based filters — no
// third-party moderation call, see lib/moderation.js) and schema-validated the
// first time it was generated, so a cache hit legitimately skips Serper, the
// AI generation call, AND both moderation passes — turning a ~20-60s
// pipeline into a single lookup.
//
// TTL is deliberately modest (default 6 hours) because Part 3 of every lesson
// is grounded in "what's happening in the real world right now".

import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { getDb } from "./mongodb.js";

const DEFAULT_LESSON_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_LESSON_CACHE_MAX_MEMORY_ENTRIES = 100;
const CACHE_COLLECTION = "lessonCache";

function parsePositiveInt(value, fallbackValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallbackValue;
}

const LESSON_CACHE_TTL_MS = parsePositiveInt(
  process.env.LESSON_CACHE_TTL_MS,
  DEFAULT_LESSON_CACHE_TTL_MS
);
const LESSON_CACHE_MAX_MEMORY_ENTRIES = parsePositiveInt(
  process.env.LESSON_CACHE_MAX_MEMORY_ENTRIES,
  DEFAULT_LESSON_CACHE_MAX_MEMORY_ENTRIES
);
// LATENCY: the Mongo tier sits on the critical path BEFORE generation starts.
// A healthy findOne takes single-digit ms; a degraded/unreachable cluster can
// hang for the driver's full server-selection window (10s) — which would delay
// EVERY lesson by that much for a cache that is merely an optimization. Cap
// the lookup and treat a slow answer as a miss; writes stay fire-and-forget.
const DEFAULT_LESSON_CACHE_LOOKUP_TIMEOUT_MS = 800;
const LESSON_CACHE_LOOKUP_TIMEOUT_MS = parsePositiveInt(
  process.env.LESSON_CACHE_LOOKUP_TIMEOUT_MS,
  DEFAULT_LESSON_CACHE_LOOKUP_TIMEOUT_MS
);

export function isLessonCacheEnabled() {
  const raw = (process.env.LESSON_CACHE_ENABLED || "true").trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(raw);
}

// In-memory LRU tier. `lru-cache` handles recency-eviction (reads bump
// recency, writes evict the oldest entry) and the capacity cap for us; per-
// entry TTL expiry is enforced by storing each value with its own `ttl`.
const memoryCache = new LRUCache({
  max: LESSON_CACHE_MAX_MEMORY_ENTRIES,
});

function memoryGet(key) {
  const entry = memoryCache.get(key);
  if (entry === undefined) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.lesson;
}

function memorySet(key, lesson, expiresAt) {
  // Guard: don't cache entries that are already expired (clock skew, etc.)
  if (expiresAt <= Date.now()) return;
  // ttls are keyed per-entry so each lesson expires exactly at its own
  // expiresAt, independent of when it was written.
  memoryCache.set(key, { lesson, expiresAt }, { ttl: expiresAt - Date.now() });
}

function normalizePersonalization(personalization) {
  // SECURITY: do NOT gate on `onboarded`. `buildAdaptationPlan`
  // (personalization.js) applies notes/goals/checklist to the prompt
  // UNCONDITIONALLY — it never checks `onboarded`. If the cache key ignored
  // personalization for `onboarded:false` requests, an attacker could send
  // `onboarded:false` + crafted goals/notes and have the resulting shaped
  // lesson cached under the SAME key as every no-personalization request for
  // that (question, language, level, mode), poisoning the default cohort
  // fleet-wide. Any input that shapes the prompt MUST contribute to the key.
  if (!personalization || typeof personalization !== "object") return "";
  const checklist = Array.isArray(personalization.checklist)
    ? personalization.checklist.slice().sort().join(",")
    : "";
  const notes = String(personalization.notes ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  // Goals are high-authority explicit signals — two learners with identical
  // checklist/notes but different goals must get distinct cache keys, otherwise
  // the goal (the highest-authority directive) would be silently ignored on a
  // cache hit.
  const goals = String(personalization.goals ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  // Collapse a genuinely-empty payload to "" (same key as a null personalization)
  // so the default no-personalization cohort keeps sharing one cache entry. Any
  // NON-empty field still produces a distinct, content-bound key — which is what
  // closes the poisoning vector, independent of the `onboarded` flag.
  if (!checklist && !notes && !goals) return "";
  return `${checklist}|${notes}|${goals}`;
}

/**
 * Normalize the learning-context snippet for the cache key. The context is a
 * compact, topic-relevant summary of the learner's quiz-verified knowledge. It
 * is included in the cache key so two learners (or the same learner at a
 * different point in their journey) with different knowledge profiles get
 * distinct, knowledge-tailored lessons even when the question + prefs match.
 */
function normalizeLearningContext(learningContext) {
  return String(learningContext ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Deterministic cache key for a lesson request. Case and extra whitespace in
 * the question don't change the key, so trivially different phrasings of the
 * exact same question still hit the cache. Personalization is included so that
 * two learners asking the same question with different preferences get
 * distinct, tailored lessons.
 */
export function lessonCacheKey(
  question,
  language,
  level,
  mode = "explain",
  personalization = null,
  learningContext = ""
) {
  const normalizedQuestion = String(question ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const material = `${normalizedQuestion}|${language ?? ""}|${level ?? ""}|${mode ?? "explain"}|${normalizePersonalization(personalization)}|${normalizeLearningContext(learningContext)}`;
  return crypto.createHash("sha256").update(material).digest("hex");
}

let ttlIndexPromise = null;
function ensureTtlIndex(db) {
  if (ttlIndexPromise) return ttlIndexPromise;
  ttlIndexPromise = (async () => {
    await db
      .collection(CACHE_COLLECTION)
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection(CACHE_COLLECTION).createIndex({ key: 1 }, { unique: true });
  })().catch((error) => {
    // Index creation failing must never break lesson generation.
    ttlIndexPromise = null;
    console.warn("[lessonCache] Failed to ensure indexes", error?.message);
  });
  return ttlIndexPromise;
}

export function ensureLessonCacheIndexes(db) {
  return ensureTtlIndex(db);
}

/**
 * Look up a cached lesson. Never throws — any storage error degrades to a
 * cache miss so the normal generation path takes over.
 */
export async function getCachedLesson(key) {
  if (!isLessonCacheEnabled()) return null;

  const fromMemory = memoryGet(key);
  if (fromMemory) {
    console.log("[lessonCache] Memory hit", { key: key.slice(0, 12) });
    return fromMemory;
  }

  // The Mongo lookup races a short deadline: past it, generation proceeds as
  // a miss while the lookup (if it ever completes) still back-fills the
  // memory tier for the next request. Never throws.
  const mongoLookup = (async () => {
    try {
      const db = await getDb();
      // Project only what we use — skips shipping key/createdAt/updatedAt
      // bytes over the wire on every cache hit.
      const doc = await db
        .collection(CACHE_COLLECTION)
        .findOne({ key }, { projection: { _id: 0, lesson: 1, expiresAt: 1 } });
      if (!doc?.lesson) return null;
      const expiresAt = doc.expiresAt instanceof Date ? doc.expiresAt.getTime() : 0;
      if (expiresAt <= Date.now()) return null; // TTL monitor may lag; enforce here.
      memorySet(key, doc.lesson, expiresAt);
      console.log("[lessonCache] Mongo hit", { key: key.slice(0, 12) });
      return doc.lesson;
    } catch (error) {
      console.warn("[lessonCache] Lookup failed; treating as miss", error?.message);
      return null;
    }
  })();

  let deadlineTimer = null;
  const deadline = new Promise((resolve) => {
    deadlineTimer = setTimeout(() => {
      console.warn("[lessonCache] Mongo lookup exceeded deadline; treating as miss", {
        key: key.slice(0, 12),
        timeoutMs: LESSON_CACHE_LOOKUP_TIMEOUT_MS,
      });
      resolve(null);
    }, LESSON_CACHE_LOOKUP_TIMEOUT_MS);
  });

  try {
    return await Promise.race([mongoLookup, deadline]);
  } finally {
    clearTimeout(deadlineTimer);
  }
}

/**
 * Store a fully validated lesson in both tiers. Fire-and-forget safe: all
 * errors are swallowed after logging.
 */
export function setCachedLesson(key, lesson) {
  if (!isLessonCacheEnabled() || !lesson) return;

  const expiresAtMs = Date.now() + LESSON_CACHE_TTL_MS;
  memorySet(key, lesson, expiresAtMs);

  (async () => {
    try {
      const db = await getDb();
      await ensureTtlIndex(db);
      await db.collection(CACHE_COLLECTION).updateOne(
        { key },
        {
          $set: {
            key,
            lesson,
            expiresAt: new Date(expiresAtMs),
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
      console.log("[lessonCache] Lesson stored", { key: key.slice(0, 12) });
    } catch (error) {
      console.warn("[lessonCache] Store failed (non-fatal)", error?.message);
    }
  })();
}
