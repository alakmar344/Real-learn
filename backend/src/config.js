// Central env parsing + startup validation + the shared constants routes need.
// Everything here is evaluated once at import time (process start), exactly as
// it was when these blocks lived at the top of server.js.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Service version, read once from package.json. Non-sensitive; surfaced by the
// public /health endpoint so uptime monitors can detect deploy rollovers.
export const SERVICE_VERSION = (() => {
  try {
    const pkgRaw = fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8");
    const parsed = JSON.parse(pkgRaw);
    return typeof parsed.version === "string" ? parsed.version : "unknown";
  } catch {
    return "unknown";
  }
})();

export const PORT = Number(process.env.PORT || 10000);

export const PRIVACY_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || "3.6";
export const TERMS_OF_SERVICE_VERSION = process.env.TERMS_OF_SERVICE_VERSION || "3.3";
export const COOKIE_POLICY_VERSION = process.env.COOKIE_POLICY_VERSION || "2.3";

// ── Input validation limits (security: bound prompt size and lock free-text
// fields that are interpolated into the LLM prompt to known values) ──
export const MAX_QUESTION_LENGTH = 1000;
export const ALLOWED_LANGUAGES = new Set([
  "English",
  "Hindi",
  "Gujarati",
  "Tamil",
  "Bengali",
  "Marathi",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Urdu",
  "Odia",
]);
export const ALLOWED_LEVELS = new Set(["Class 6-8", "Class 9-10", "College / Advanced"]);
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 20;
const configuredRateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS);
export const RATE_LIMIT_WINDOW_MS =
  Number.isFinite(configuredRateLimitWindowMs) && configuredRateLimitWindowMs > 0
    ? configuredRateLimitWindowMs
    : DEFAULT_RATE_LIMIT_WINDOW_MS;
const configuredRateLimitMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS);
export const RATE_LIMIT_MAX_REQUESTS =
  Number.isFinite(configuredRateLimitMax) && configuredRateLimitMax > 0
    ? configuredRateLimitMax
    : DEFAULT_RATE_LIMIT_MAX_REQUESTS;

const DEFAULT_LESSON_TIMEOUT_MS = 300000;
const MIN_LESSON_TIMEOUT_MS = 30000;
const MAX_LESSON_TIMEOUT_MS = 600000;
// Per-call timeout for one full hedged generation attempt (all providers,
// retries and rotations included). Hung/silent requests are killed in seconds
// by the engine's first-byte + stall watchdogs, so this ceiling only bounds a
// SLOW-BUT-STREAMING generation. It must therefore fit the slowest healthy
// case (a 4k-token explain lesson on a slower fallback model can legitimately
// take 60-80s) — the old 45s cap was sized for the fast primary and killed
// healthy fallback generations mid-stream.
const DEFAULT_AI_CALL_TIMEOUT_MS = 90000;
const configuredLessonTimeoutMs = Number(process.env.LESSON_TIMEOUT_MS);
export const LESSON_TIMEOUT_MS =
  Number.isFinite(configuredLessonTimeoutMs) && configuredLessonTimeoutMs > 0
    ? Math.min(
        Math.max(configuredLessonTimeoutMs, MIN_LESSON_TIMEOUT_MS),
        MAX_LESSON_TIMEOUT_MS
      )
    : DEFAULT_LESSON_TIMEOUT_MS;
if (
  Number.isFinite(configuredLessonTimeoutMs) &&
  configuredLessonTimeoutMs > 0 &&
  configuredLessonTimeoutMs < MIN_LESSON_TIMEOUT_MS
) {
  console.warn(
    `[config] LESSON_TIMEOUT_MS clamped from ${configuredLessonTimeoutMs}ms to minimum ${MIN_LESSON_TIMEOUT_MS}ms`
  );
}
if (
  Number.isFinite(configuredLessonTimeoutMs) &&
  configuredLessonTimeoutMs > MAX_LESSON_TIMEOUT_MS
) {
  console.warn(
    `[config] LESSON_TIMEOUT_MS clamped from ${configuredLessonTimeoutMs}ms to maximum ${MAX_LESSON_TIMEOUT_MS}ms`
  );
}
const configuredAiCallTimeoutMs = Number(process.env.AI_CALL_TIMEOUT_MS);
export const AI_CALL_TIMEOUT_MS =
  Number.isFinite(configuredAiCallTimeoutMs) && configuredAiCallTimeoutMs > 0
    ? configuredAiCallTimeoutMs
    : DEFAULT_AI_CALL_TIMEOUT_MS;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15000;
const MAX_HEARTBEAT_INTERVAL_MS = 55000;
const configuredHeartbeatIntervalMs = Number(process.env.SSE_HEARTBEAT_INTERVAL_MS);
export const HEARTBEAT_INTERVAL_MS =
  Number.isFinite(configuredHeartbeatIntervalMs) && configuredHeartbeatIntervalMs > 0
    ? Math.min(configuredHeartbeatIntervalMs, MAX_HEARTBEAT_INTERVAL_MS)
    : DEFAULT_HEARTBEAT_INTERVAL_MS;
const DEFAULT_MAX_CONCURRENT_LESSON_REQUESTS = 6;
const DEFAULT_FAILURE_ALERT_THRESHOLD = 5;
const configuredMaxConcurrentRequests = Number(process.env.MAX_CONCURRENT_LESSON_REQUESTS);
export const MAX_CONCURRENT_LESSON_REQUESTS =
  Number.isFinite(configuredMaxConcurrentRequests) && configuredMaxConcurrentRequests > 0
    ? configuredMaxConcurrentRequests
    : DEFAULT_MAX_CONCURRENT_LESSON_REQUESTS;
const configuredFailureAlertThreshold = Number(process.env.LESSON_FAILURE_ALERT_THRESHOLD);
export const LESSON_FAILURE_ALERT_THRESHOLD =
  Number.isFinite(configuredFailureAlertThreshold) && configuredFailureAlertThreshold > 0
    ? configuredFailureAlertThreshold
    : DEFAULT_FAILURE_ALERT_THRESHOLD;
const DEFAULT_MAX_CONCURRENT_LESSON_REQUESTS_PER_USER = 2;
const configuredPerUserConcurrency = Number(process.env.MAX_CONCURRENT_LESSON_REQUESTS_PER_USER);
export const MAX_CONCURRENT_LESSON_REQUESTS_PER_USER =
  Number.isFinite(configuredPerUserConcurrency) && configuredPerUserConcurrency > 0
    ? configuredPerUserConcurrency
    : DEFAULT_MAX_CONCURRENT_LESSON_REQUESTS_PER_USER;

// Single-flight followers hold no concurrency slot but each keeps an open SSE
// connection plus a heartbeat/progress/slow-notice timer for up to the lesson
// deadline. Cap how many can pile onto ONE in-flight cacheKey so a burst of
// identical questions can't exhaust sockets/timers behind the concurrency gate.
const DEFAULT_MAX_IN_FLIGHT_FOLLOWERS = 200;
const configuredMaxFollowers = Number(process.env.MAX_IN_FLIGHT_FOLLOWERS_PER_KEY);
export const MAX_IN_FLIGHT_FOLLOWERS_PER_KEY =
  Number.isFinite(configuredMaxFollowers) && configuredMaxFollowers > 0
    ? configuredMaxFollowers
    : DEFAULT_MAX_IN_FLIGHT_FOLLOWERS;

export function validateStartupConfig() {
  const hasGroqConfig = Boolean(process.env.GROQ_API_KEY?.trim());
  const hasMistralConfig = Boolean(process.env.MISTRAL_API_KEY?.trim());
  const hasNvidiaConfig = Boolean(process.env.NVIDIA_API_KEY?.trim());
  const hasCloudflareConfig = Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  );
  if (!hasGroqConfig && !hasMistralConfig && !hasNvidiaConfig && !hasCloudflareConfig) {
    throw new Error(
      "Missing required environment variables: set GROQ_API_KEY, MISTRAL_API_KEY, NVIDIA_API_KEY, or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID"
    );
  }
  // Fail fast in production on missing critical config: without MONGODB_URI
  // every consent write, lesson-cache lookup, and moderation log fails at
  // runtime — better to refuse to boot than to serve a half-broken service.
  // Dev keeps working without a database.
  if (process.env.NODE_ENV === "production") {
    // lib/mongodb.js accepts either variable name.
    if (!process.env.MONGODB_URI?.trim() && !process.env.MONGODB_URL?.trim()) {
      throw new Error(
        "MONGODB_URI must be set in production — consent records, the lesson cache, and moderation logs all require MongoDB"
      );
    }
    // Not fatal (the defaults are this app's real production issuer/key), but
    // a deploy relying on baked-in auth constants should be a conscious choice.
    if (
      !process.env.CLERK_FRONTEND_API?.trim() ||
      !process.env.CLERK_JWT_PUBLIC_KEY?.trim()
    ) {
      console.warn(
        "[startup] WARNING: Clerk auth is using the baked-in default issuer and/or JWT fallback public key (see src/lib/auth.js). Set CLERK_FRONTEND_API and CLERK_JWT_PUBLIC_KEY explicitly for this deployment."
      );
    }
  }
}
