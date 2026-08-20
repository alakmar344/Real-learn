// Public capability endpoint — tells the frontend what the backend supports
// without requiring authentication.
import {
  MAX_QUESTION_LENGTH,
  ALLOWED_LANGUAGES,
  ALLOWED_LEVELS,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
  COOKIE_POLICY_VERSION,
  SERVICE_VERSION,
} from "../config.js";
import { getProviderHealthSnapshot, allCircuitsOpen } from "../lib/aiEngine.js";
import { createRateLimiter } from "../lib/rateLimit.js";

const readyRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
});

export function readyHandler(_req, res) {
  const aiSnapshot = getProviderHealthSnapshot();
  const aiOutage = allCircuitsOpen();
  const aiDegraded =
    aiOutage ||
    Object.values(aiSnapshot).some(
      (provider) => provider.circuitOpen || provider.consecutiveFailures > 0
    );

  const payload = {
    ok: true,
    version: SERVICE_VERSION,
    capabilities: {
      lessonGeneration: true,
      textToSpeech: true,
      speechToText: true,
      multilingual: true,
    },
    limits: {
      maxQuestionLength: MAX_QUESTION_LENGTH,
    },
    languages: Array.from(ALLOWED_LANGUAGES),
    levels: Array.from(ALLOWED_LEVELS),
    modes: ["fast", "explain"],
    policies: {
      privacy: PRIVACY_POLICY_VERSION,
      terms: TERMS_OF_SERVICE_VERSION,
      cookies: COOKIE_POLICY_VERSION,
    },
    ai: {
      status: aiOutage ? "down" : aiDegraded ? "degraded" : "ok",
      providers: Object.fromEntries(
        Object.entries(aiSnapshot).map(([key, health]) => [
          key,
          {
            status: health.circuitOpen ? "degraded" : "ok",
            latencyMs: health.ewmaLatencyMs,
          },
        ])
      ),
    },
  };

  if (res.header && typeof res.header === "function") {
    res.header("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
    return res.code(200).send(payload);
  }
  if (res.setHeader && typeof res.setHeader === "function") {
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  }
  if (res.status && typeof res.status === "function") {
    return res.status(200).json(payload);
  }
}

export default async function readyRoutes(fastify) {
  fastify.get("/api/ready", { preHandler: [readyRateLimiter] }, readyHandler);
}
