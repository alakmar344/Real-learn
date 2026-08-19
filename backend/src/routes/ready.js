// Public capability endpoint — tells the frontend what the backend supports
// without requiring authentication. This lets the frontend avoid hard-coding
// constants (max question length, language list, policy versions) and adapt
// to backend health/capabilities at runtime.
import express from "express";
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

const router = express.Router();

// This endpoint is cheap but public — cap it so it can't be used as an
// amplification vector.
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

  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  res.status(200).json({
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
  });
}

router.get("/api/ready", readyRateLimiter, readyHandler);

export default router;
