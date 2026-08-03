import { getDb } from "./mongodb.js";

const LESSON_CACHE_COLLECTION = "lessonCache";
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 25;

let indexesEnsured = false;

function clampLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SEARCH_LIMIT;
  return Math.min(Math.floor(parsed), MAX_SEARCH_LIMIT);
}

export function sanitizeSearchQuery(query) {
  if (typeof query !== "string") return "";
  return query
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/[<>]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

export async function ensureLessonSearchIndexes(db) {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    await db.collection(LESSON_CACHE_COLLECTION).createIndex(
      {
        "lesson.title": "text",
        "lesson.parts.title": "text",
        "lesson.parts.content": "text",
        "lesson.keyTakeaways": "text",
      },
      {
        name: "lesson_text_search",
        weights: {
          "lesson.title": 10,
          "lesson.parts.title": 6,
          "lesson.keyTakeaways": 4,
          "lesson.parts.content": 1,
        },
        default_language: "none",
      }
    );
    await db.collection(LESSON_CACHE_COLLECTION).createIndex(
      { updatedAt: -1, expiresAt: 1 },
      { name: "lesson_recent_active" }
    );
  } catch (error) {
    indexesEnsured = false;
    throw error;
  }
}

function summarizeLesson(lesson) {
  const parts = Array.isArray(lesson?.parts) ? lesson.parts : [];
  const firstContent = String(parts[0]?.content ?? "").replace(/\s+/g, " ").trim();
  return {
    title: lesson?.title || parts[0]?.title || "Untitled lesson",
    summary: firstContent.slice(0, 240),
    subject: lesson?.subject || parts[0]?.subject || "General",
    partCount: parts.length,
    keyTakeaways: Array.isArray(lesson?.keyTakeaways) ? lesson.keyTakeaways.slice(0, 3) : [],
  };
}

export async function searchCachedLessons(query, options = {}) {
  const cleanQuery = sanitizeSearchQuery(query);
  if (!cleanQuery || cleanQuery.length < 2) {
    return { query: cleanQuery, results: [] };
  }

  const db = await getDb();
  await ensureLessonSearchIndexes(db);
  const limit = clampLimit(options.limit);
  const now = new Date();

  const docs = await db.collection(LESSON_CACHE_COLLECTION)
    .find(
      { $text: { $search: cleanQuery }, expiresAt: { $gt: now } },
      {
        projection: {
          key: 1,
          lesson: 1,
          updatedAt: 1,
          score: { $meta: "textScore" },
        },
        sort: { score: { $meta: "textScore" }, updatedAt: -1 },
        limit,
      }
    )
    .toArray();

  return {
    query: cleanQuery,
    results: docs.map((doc) => ({
      id: doc.key,
      score: doc.score,
      updatedAt: doc.updatedAt,
      ...summarizeLesson(doc.lesson),
    })),
  };
}
