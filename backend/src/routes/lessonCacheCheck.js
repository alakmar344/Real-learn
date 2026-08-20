// Instant cache-peek endpoint: tells the frontend whether a lesson would be
// served from cache BEFORE paying the cost of opening an SSE stream.
import { requireAuth } from "../lib/auth.js";
import { apiRateLimiter } from "../lib/rateLimit.js";
import { getCachedLesson, lessonCacheKey } from "../lib/lessonCache.js";
import {
  parseLessonBody,
  validateLessonRequest,
  moderateLessonInput,
} from "../lib/lessonRequest.js";

let cacheCheckCounter = 0;

function expectedPartsCount(mode, cachedLesson) {
  if (cachedLesson && Array.isArray(cachedLesson.parts)) {
    return cachedLesson.parts.length;
  }
  return mode === "fast" ? 1 : 3;
}

export async function lessonCacheCheckHandler(req, res) {
  const requestId = `cache-check-${Date.now()}-${++cacheCheckCounter}`;
  const parsed = parseLessonBody(req);
  const validation = validateLessonRequest(parsed);

  const send = (status, payload) => {
    if (res.code && typeof res.code === "function") {
      if (res.header && typeof res.header === "function") {
        res.header("Cache-Control", "private, no-store");
      }
      return res.code(status).send(payload);
    }
    if (res.setHeader && typeof res.setHeader === "function") {
      res.setHeader("Cache-Control", "private, no-store");
    }
    if (res.status && typeof res.status === "function") {
      return res.status(status).json(payload);
    }
  };

  if (!validation.ok) {
    return send(validation.status, {
      requestId,
      cached: false,
      error: validation.error,
    });
  }

  // Cache hits are only meaningful for content that passes input moderation.
  const moderation = await moderateLessonInput(parsed.question);
  if (!moderation.ok) {
    return send(400, {
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

  return send(200, {
    requestId,
    cached: Boolean(cachedLesson),
    mode: parsed.mode,
    expectedParts: expectedPartsCount(parsed.mode, cachedLesson),
    keyHash: cacheKey.slice(0, 16),
  });
}

export default async function lessonCacheCheckRoutes(fastify) {
  fastify.post(
    "/api/lesson-cache-check",
    { preHandler: [apiRateLimiter, requireAuth] },
    lessonCacheCheckHandler
  );
}
