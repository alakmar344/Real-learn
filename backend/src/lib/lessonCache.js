// Two-tier lesson cache — a speed tactic that makes repeat questions instant.
//
// Tier 1: in-memory LRU — sub-millisecond hits on this instance.
// Tier 2: MongoDB with a TTL index — survives restarts and is shared across
//         instances, so any server in the fleet benefits from any other's work.
//
// A cached lesson was already moderated (regex + LLM) and schema-validated the
// first time it was generated, so a cache hit legitimately skips Serper, the
// Gemma generation call, AND both moderation passes — turning a ~20-60s
// pipeline into a single lookup.
//
// TTL is deliberately modest (default 6 hours) because Part 3 of every lesson
// is grounded in "what's happening in the real world right now".

import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { getDb } from "./mongodb.js";

const DEFAULT_LESSON_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_LESSON_CACHE_MAX_MEMORY_ENTRIES = 200;
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
  // ttls are keyed per-entry so each lesson expires exactly at its own
  // expiresAt, independent of when it was written.
  memoryCache.set(key, { lesson, expiresAt }, { ttl: expiresAt - Date.now() });
}

function normalizePersonalization(personalization) {
  if (!personalization?.onboarded) return "";
  const checklist = Array.isArray(personalization.checklist)
    ? personalization.checklist.slice().sort().join(",")
    : "";
  const notes = String(personalization.notes ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${checklist}|${notes}`;
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
  personalization = null
) {
  const normalizedQuestion = String(question ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const material = `${normalizedQuestion}|${language ?? ""}|${level ?? ""}|${mode ?? "explain"}|${normalizePersonalization(personalization)}`;
  return crypto.createHash("sha256").update(material).digest("hex");
}

let ttlIndexEnsured = false;
async function ensureTtlIndex(db) {
  if (ttlIndexEnsured) return;
  ttlIndexEnsured = true;
  try {
    await db
      .collection(CACHE_COLLECTION)
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection(CACHE_COLLECTION).createIndex({ key: 1 }, { unique: true });
  } catch (error) {
    // Index creation failing must never break lesson generation.
    ttlIndexEnsured = false;
    console.warn("[lessonCache] Failed to ensure indexes", error?.message);
  }
}

let searchIndexPromise = null;

/**
 * Ensure a compound text index over the embedded lesson fields so users can
 * search previously generated lessons by title, key takeaway, or content. The
 * index is idempotent and non-fatal — creation failures are logged and retried
 * on the next call.
 */
export async function ensureSearchIndex(db) {
  if (searchIndexPromise) return searchIndexPromise;
  searchIndexPromise = (async () => {
    await db.collection(CACHE_COLLECTION).createIndex(
      {
        "lesson.title": "text",
        "lesson.keyTakeaways": "text",
        "lesson.content": "text",
      },
      {
        name: "lessonSearchText",
        default_language: "none",
        weights: {
          "lesson.title": 10,
          "lesson.keyTakeaways": 8,
          "lesson.content": 5,
        },
      }
    );
    console.log("[lessonCache] Text search index ensured");
  })().catch((error) => {
    searchIndexPromise = null;
    console.warn("[lessonCache] Failed to ensure search index", error?.message);
  });
  return searchIndexPromise;
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

  try {
    const db = await getDb();
    const doc = await db.collection(CACHE_COLLECTION).findOne({ key });
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
}

/**
 * Remove a lesson from BOTH tiers — used when a post-hoc moderation verdict
 * flags an already-cached lesson so no other user can be served it.
 * Fire-and-forget safe: all errors are swallowed after logging.
 */
export function deleteCachedLesson(key) {
  memoryCache.delete(key);
  (async () => {
    try {
      const db = await getDb();
      await db.collection(CACHE_COLLECTION).deleteOne({ key });
      console.log("[lessonCache] Lesson evicted", { key: key.slice(0, 12) });
    } catch (error) {
      console.warn("[lessonCache] Evict failed (non-fatal)", error?.message);
    }
  })();
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
