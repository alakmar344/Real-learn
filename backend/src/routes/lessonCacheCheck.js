// Instant cache-peek endpoint: tells the frontend whether a lesson would be
// served from cache BEFORE paying the cost of opening an SSE stream. This
// powers the "Instant answer" badge and lets the UI skip the loading cinematic
// for repeat questions.
import express from "express";
import { requireAuth } from "../lib/auth.js";
import { apiRateLimiter } from "../lib/rateLimit.js";
import { getCachedLesson, lessonCacheKey } from "../lib/lessonCache.js";
import {
  parseLessonBody,
  validateLessonRequest,
  moderateLessonInput,
} from "../lib/lessonRequest.js";

const router = express.Router();
const rateLimit = apiRateLimiter;

let cacheCheckCounter = 0;

function expectedPartsCount(mode, cachedLesson) {
  if (cachedLesson && Array.isArray(cachedLesson.parts)) {
    return cachedLesson.parts.length;
  }
  return mode === "fast" ? 1 : 3;
}

router.post("/api/lesson-cache-check", rateLimit, requireAuth, async (req, res) => {
  const requestId = `cache-check-${Date.now()}-${++cacheCheckCounter}`;
  const parsed = parseLessonBody(req);
  const validation = validateLessonRequest(parsed);

  if (!validation.ok) {
    return res.status(validation.status).json({
      requestId,
      cached: false,
      error: validation.error,
    });
  }

  // Cache hits are only meaningful for content that passes input moderation.
  // Run the same single pass as generate-lesson so a blocked question can't
  // be probed via cache-check either.
  const moderation = await moderateLessonInput(parsed.question);
  if (!moderation.ok) {
    return res.status(400).json({
      requestId,
      cached: false,
      error: moderation.error,
    });
  }

  const cacheKey = lessonCacheKey(
    parsed.question,
    parsed.language,
    parsed.level,
    parsed.mode,
    parsed.personalization,
    parsed.learningContextRaw
  );

  const cachedLesson = await getCachedLesson(cacheKey);

  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).json({
    requestId,
    cached: Boolean(cachedLesson),
    mode: parsed.mode,
    expectedParts: expectedPartsCount(parsed.mode, cachedLesson),
    keyHash: cacheKey.slice(0, 16),
  });
});

export default router;
