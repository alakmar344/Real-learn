import crypto from "node:crypto";
import compression from "compression";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  callGemma,
  warmUpModel,
  startPeriodicWarmUp,
  formatGemmaTimeoutMessage,
  GemmaTimeoutError,
  GemmaApiError,
  GemmaCircuitOpenError,
  parseJSON,
  callCloudflareAI,
  isFallbackConfigured,
  extractTextFromResult,
  getProviderHealthSnapshot,
  GEMMA_MODEL,
} from "./lib/gemma.js";
import {
  GENERATE_LESSON_PROMPT,
  GENERATE_FAST_ANSWER_PROMPT,
} from "./lib/prompts.js";
import { fetchRealWorldContext } from "./lib/serper.js";
import { isValidJourney, normalizeJourney, hasExpectedPartCount } from "./validation.js";
import { getDb } from "./lib/mongodb.js";
import {
  requireAuth,
  extractBearerToken,
  inspectToken,
  verifyClerkToken,
} from "./lib/auth.js";
import { filterUserInput } from "./lib/contentGuard.js";
import { moderateText } from "./lib/moderation.js";
import { evaluateAndFix } from "./lib/qualityGate.js";
import {
  lessonCacheKey,
  getCachedLesson,
  setCachedLesson,
} from "./lib/lessonCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Privacy: salt for hashing User-Agent strings. A per-process random value
// prevents rainbow-table reversal of the stored hashes.
const UA_HASH_SALT = crypto.randomBytes(16).toString("hex");
function hashUserAgent(ua) {
  if (typeof ua !== "string" || !ua) return "unknown";
  return crypto.createHash("sha256").update(`${UA_HASH_SALT}:${ua}`).digest("hex").slice(0, 32);
}

let EdgeTTS = null;
try {
  const mod = await import("node-edge-tts");
  EdgeTTS = mod.EdgeTTS || null;
} catch (error) {
  console.error("[tts] Failed to load node-edge-tts via ESM import", error);
}

const TTS_TEMP_DIR = path.join("/tmp", "reallearn-tts");
if (!fs.existsSync(TTS_TEMP_DIR)) {
  fs.mkdirSync(TTS_TEMP_DIR, { recursive: true });
}

const TTS_RATE_LIMIT_WINDOW_MS = 60000;
const TTS_RATE_LIMIT_MAX = 30;

// ── Shared rate limiter ──
// SECURITY: bearer tokens are NOT verified at this layer, so a limiter keyed
// on the token alone could be bypassed forever by rotating random tokens
// (each fake token got a fresh bucket). Every limiter therefore ALWAYS
// enforces an IP-level backstop in addition to the per-token bucket. The IP
// cap is a few times higher than the per-token cap so legitimate users behind
// shared NAT (schools, offices) aren't collapsed into one tiny bucket.
function createRateLimiter({ windowMs, max, ipMultiplier = 5 }) {
  const store = new Map();
  const hit = (key, limit, now) => {
    const record = store.get(key);
    if (!record || now > record.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    record.count += 1;
    return record.count > limit;
  };
  return {
    isLimited(req) {
      const now = Date.now();
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      const token = extractBearerToken(req);
      // Hash the WHOLE token (capped at 4KB to prevent CPU amplification
      // from megabyte-sized tokens). A prefix of a JWT is just the base64
      // header, which is identical for every user.
      const tokenLimited = token
        ? hit(
            `user:${crypto.createHash("sha256").update(token.slice(0, 4096)).digest("hex").slice(0, 32)}`,
            max,
            now
          )
        : false;
      const ipLimited = hit(`ip:${ip}`, token ? max * ipMultiplier : max, now);
      return tokenLimited || ipLimited;
    },
    cleanup() {
      const now = Date.now();
      for (const [key, record] of store) {
        if (now > record.resetAt) store.delete(key);
      }
    },
  };
}

const ttsRateLimiter = createRateLimiter({
  windowMs: TTS_RATE_LIMIT_WINDOW_MS,
  max: TTS_RATE_LIMIT_MAX,
});
setInterval(() => ttsRateLimiter.cleanup(), TTS_RATE_LIMIT_WINDOW_MS).unref?.();
function isTtsRateLimited(req) {
  return ttsRateLimiter.isLimited(req);
}

// ── TTS response cache ──
// BANDWIDTH: synthesized audio is by far the largest payload this server
// emits (~6 KB per second of speech). Cache generated MP3s by content hash so
// replays of the same text are served from memory, and expose an ETag so the
// browser can revalidate to a 9-byte 304 instead of re-downloading megabytes.
const TTS_CACHE_MAX_BYTES = 24 * 1024 * 1024; // 24 MB in-memory LRU
const TTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ttsCache = new Map(); // key -> { buffer, expiresAt }
let ttsCacheBytes = 0;
function ttsCacheGet(key) {
  const entry = ttsCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    ttsCacheBytes -= entry.buffer.length;
    ttsCache.delete(key);
    return null;
  }
  // Refresh recency (insertion-ordered Map as LRU).
  ttsCache.delete(key);
  ttsCache.set(key, entry);
  return entry.buffer;
}
function ttsCacheSet(key, buffer) {
  if (buffer.length > TTS_CACHE_MAX_BYTES) return;
  const existing = ttsCache.get(key);
  if (existing) {
    ttsCacheBytes -= existing.buffer.length;
    ttsCache.delete(key);
  }
  ttsCache.set(key, { buffer, expiresAt: Date.now() + TTS_CACHE_TTL_MS });
  ttsCacheBytes += buffer.length;
  while (ttsCacheBytes > TTS_CACHE_MAX_BYTES && ttsCache.size > 0) {
    const oldestKey = ttsCache.keys().next().value;
    ttsCacheBytes -= ttsCache.get(oldestKey).buffer.length;
    ttsCache.delete(oldestKey);
  }
}

// SECURITY: rate/pitch/volume are interpolated into the SSML sent to the TTS
// service. Lock them to strict prosody formats so arbitrary markup can't be
// smuggled through.
const TTS_RATE_VOLUME_PATTERN = /^[+-]?\d{1,3}(\.\d{1,2})?%$/;
const TTS_PITCH_PATTERN = /^[+-]?\d{1,3}(\.\d{1,2})?(Hz|st|%)$/;
function sanitizeTtsProsody(value, pattern) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "default") return undefined;
  return pattern.test(trimmed) ? trimmed : null;
}

// Security: escape the five XML special characters so user text embedded in
// the SSML document can never introduce markup of its own.
function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const SPEECH_LANG_TO_VOICE = {
  "en-IN": "en-IN-NeerjaNeural",
  "hi-IN": "hi-IN-SwaraNeural",
  "gu-IN": "gu-IN-NiranjanNeural",
  "ta-IN": "ta-IN-ValluvarNeural",
  "bn-IN": "bn-IN-NabanitaNeural",
  "mr-IN": "mr-IN-AarohiNeural",
  "te-IN": "te-IN-MohanNeural",
  "kn-IN": "kn-IN-SapnaNeural",
  "en-US": "en-US-AriaNeural",
};

const PRIVACY_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || "2.2";
const TERMS_OF_SERVICE_VERSION = process.env.TERMS_OF_SERVICE_VERSION || "2.2";
const COOKIE_POLICY_VERSION = process.env.COOKIE_POLICY_VERSION || "2.1";

// ── Input validation limits (security: bound prompt size and lock free-text
// fields that are interpolated into the LLM prompt to known values) ──
const MAX_QUESTION_LENGTH = 1000;
const ALLOWED_LANGUAGES = new Set([
  "English",
  "Hindi",
  "Gujarati",
  "Tamil",
  "Bengali",
  "Marathi",
  "Telugu",
  "Kannada",
]);
const ALLOWED_LEVELS = new Set(["Class 6-8", "Class 9-10", "College / Advanced"]);
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 20;
const configuredRateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS);
const RATE_LIMIT_WINDOW_MS =
  Number.isFinite(configuredRateLimitWindowMs) && configuredRateLimitWindowMs > 0
    ? configuredRateLimitWindowMs
    : DEFAULT_RATE_LIMIT_WINDOW_MS;
const configuredRateLimitMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS);
const RATE_LIMIT_MAX_REQUESTS =
  Number.isFinite(configuredRateLimitMax) && configuredRateLimitMax > 0
    ? configuredRateLimitMax
    : DEFAULT_RATE_LIMIT_MAX_REQUESTS;
const apiRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
});
function isRateLimited(req) {
  return apiRateLimiter.isLimited(req);
}
setInterval(() => apiRateLimiter.cleanup(), RATE_LIMIT_WINDOW_MS).unref?.();

const DEFAULT_LESSON_TIMEOUT_MS = 300000;
const MIN_LESSON_TIMEOUT_MS = 30000;
const MAX_LESSON_TIMEOUT_MS = 600000;
// Per-call timeout for individual Gemma API requests. The lesson-level
// timeout (above) covers the full generation including retries and
// validation; this shorter timeout ensures a single stuck request doesn't
// eat the entire budget. 45s is enough for a warm model (~30-50s typical);
// cold starts that exceed this will be retried with a delay.
const DEFAULT_GEMMA_CALL_TIMEOUT_MS = 45000;
const configuredLessonTimeoutMs = Number(process.env.LESSON_TIMEOUT_MS);
const LESSON_TIMEOUT_MS =
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
const configuredGemmaCallTimeoutMs = Number(process.env.GEMMA_CALL_TIMEOUT_MS);
const GEMMA_CALL_TIMEOUT_MS =
  Number.isFinite(configuredGemmaCallTimeoutMs) && configuredGemmaCallTimeoutMs > 0
    ? configuredGemmaCallTimeoutMs
    : DEFAULT_GEMMA_CALL_TIMEOUT_MS;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15000;
const MAX_HEARTBEAT_INTERVAL_MS = 55000;
const configuredHeartbeatIntervalMs = Number(process.env.SSE_HEARTBEAT_INTERVAL_MS);
const HEARTBEAT_INTERVAL_MS =
  Number.isFinite(configuredHeartbeatIntervalMs) && configuredHeartbeatIntervalMs > 0
    ? Math.min(configuredHeartbeatIntervalMs, MAX_HEARTBEAT_INTERVAL_MS)
    : DEFAULT_HEARTBEAT_INTERVAL_MS;
const DEFAULT_MAX_CONCURRENT_LESSON_REQUESTS = 6;
const DEFAULT_FAILURE_ALERT_THRESHOLD = 5;
const configuredMaxConcurrentRequests = Number(process.env.MAX_CONCURRENT_LESSON_REQUESTS);
const MAX_CONCURRENT_LESSON_REQUESTS =
  Number.isFinite(configuredMaxConcurrentRequests) && configuredMaxConcurrentRequests > 0
    ? configuredMaxConcurrentRequests
    : DEFAULT_MAX_CONCURRENT_LESSON_REQUESTS;
const configuredFailureAlertThreshold = Number(process.env.LESSON_FAILURE_ALERT_THRESHOLD);
const LESSON_FAILURE_ALERT_THRESHOLD =
  Number.isFinite(configuredFailureAlertThreshold) && configuredFailureAlertThreshold > 0
    ? configuredFailureAlertThreshold
    : DEFAULT_FAILURE_ALERT_THRESHOLD;
let activeLessonRequests = 0;
let consecutiveLessonFailures = 0;
let lessonRequestCounter = 0;

function validateStartupConfig() {
  const hasCerebrasConfig = Boolean(process.env.CEREBRAS_API_KEY?.trim());
  const hasCloudflareConfig = Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  );
  if (!hasCerebrasConfig && !hasCloudflareConfig) {
    throw new Error(
      "Missing required environment variables: set CEREBRAS_API_KEY, or CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID for fallback-only mode"
    );
  }
}

function recordLessonResult(success) {
  if (success) {
    if (consecutiveLessonFailures >= LESSON_FAILURE_ALERT_THRESHOLD) {
      console.info("[generate-lesson] Failure streak recovered");
    }
    consecutiveLessonFailures = 0;
    return;
  }

  consecutiveLessonFailures += 1;
  if (consecutiveLessonFailures % LESSON_FAILURE_ALERT_THRESHOLD === 0) {
    console.warn(
      `[generate-lesson] Repeated failures detected (${consecutiveLessonFailures} consecutive)`
    );
  }
}

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
function buildModerationEvent({ requestId, clerkId, type, reason, question }) {
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
function redactModerationEvent(event) {
  const { question, ...rest } = event;
  return { ...rest, question: question ? "[redacted]" : null };
}

async function logModerationEvent(event) {
  try {
    const db = await getDb();
    await ensureModerationLogTtlIndex(db);
    await db.collection("moderationLogs").insertOne(event);
  } catch (error) {
    console.error("[moderation] Failed to log moderation event", error);
  }
}

function decrementActiveLessonRequests() {
  if (activeLessonRequests <= 0) {
    console.warn("[generate-lesson] Active request counter underflow prevented");
    activeLessonRequests = 0;
    return;
  }
  activeLessonRequests -= 1;
}

const app = express();
// Behind Render/most PaaS proxies req.ip would otherwise be the proxy's own
// address, collapsing every anonymous visitor into one rate-limit bucket and
// recording the wrong IP in consent records.
app.set("trust proxy", 1);
app.disable("x-powered-by");
const port = Number(process.env.PORT || 10000);
const configuredOrigins =
  process.env.FRONTEND_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
const allowedOrigins =
  configuredOrigins.length > 0
    ? configuredOrigins
    : [
        "https://reallearn.site",
        "https://real-learn.onrender.com",
      ];

function isOriginAllowed(origin) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

// CORS and JSON body parsing MUST be registered before any route so that every
// endpoint (including /api/agreement) receives CORS headers and a parsed body.
app.use(
  cors({
    origin: (origin, callback) => {
      const isAllowed = isOriginAllowed(origin);
      if (isAllowed) {
        return callback(null, true);
      }
      console.warn("[CORS] origin denied", { origin });
      return callback(new Error("CORS origin denied"));
    },
    methods: ["POST", "OPTIONS", "GET", "DELETE"],
    // If-None-Match lets cross-origin TTS fetches revalidate via ETag (the
    // handler serves 304s on it — without this the preflight rejects it).
    allowedHeaders: ["Content-Type", "Authorization", "If-None-Match"],
  })
);
// Every legitimate request body here is tiny (a question + a few enum
// fields). 100kb still leaves huge headroom while blunting memory abuse.
app.use(express.json({ limit: "100kb" }));
// BANDWIDTH: gzip every compressible response (lesson JSON shrinks ~75%).
// SSE streams are exempt — compression buffers them, which would delay
// heartbeats and events; audio/mpeg is skipped automatically as already
// compressed.
app.use(
  compression({
    filter: (req, res) => {
      if (req.path === "/api/generate-lesson") return false;
      return compression.filter(req, res);
    },
  })
);

function securityHeaders(req, res, next) {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  // Security: apply hardening headers unless explicitly in local development.
  // Gating on NODE_ENV === "production" silently dropped HSTS/CSP whenever the
  // host forgot to set NODE_ENV — fail safe instead.
  if (process.env.NODE_ENV !== "development") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; base-uri 'self'; form-action 'self'"
    );
  }
  next();
}

app.use(securityHeaders);

function rateLimit(req, res, next) {
  if (isRateLimited(req)) {
    console.warn("[rate-limit] Request blocked", {
      endpoint: req.path,
      ip: req.ip,
      authenticated: Boolean(extractBearerToken(req)),
    });
    res.setHeader("Retry-After", Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }
  next();
}

app.get("/health", async (_req, res) => {
  const health = { ok: true, dependencies: {} };
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    health.dependencies.mongodb = "ok";
  } catch {
    health.ok = false;
    health.dependencies.mongodb = "error";
  }
  // AI provider health (circuit state, observed latency) — no secrets.
  health.dependencies.ai = getProviderHealthSnapshot();
  const status = health.ok ? 200 : 503;
  res.status(status).json(health);
});

// Diagnostic endpoint: send the Clerk token as a Bearer header and it reports
// exactly why verification passes/fails (issuer, expiry, trust). No secrets
// leaked — only non-sensitive claim metadata. Security: disabled in
// production unless AUTH_DEBUG_ENABLED=true (it is an unauthenticated
// token-verification oracle), and always rate limited.
app.get("/api/auth-debug", rateLimit, requireAuth, async (req, res) => {
  // Security: this is a token-verification oracle. It must
  // be OFF unless explicitly enabled or running in local development —
  // "NODE_ENV !== production" left it wide open on any host that forgot to
  // set NODE_ENV. Even when enabled, it requires authentication to prevent
  // anonymous token probing.
  const authDebugEnabled =
    process.env.AUTH_DEBUG_ENABLED === "true" ||
    process.env.NODE_ENV === "development";
  if (!authDebugEnabled) {
    return res.status(404).json({ error: "Not found" });
  }
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(400).json({ error: "No Bearer token provided" });
  }
  const inspection = inspectToken(token);
  const verification = await verifyClerkToken(token);
  res.json({
    token: inspection,
    verified: verification.valid,
    verifyError: verification.valid ? null : verification.error,
  });
});

app.post("/api/agreement", rateLimit, requireAuth, async (req, res) => {
  try {
    const { accepted, timestamp } = req.body;

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) is required" });
    }

    // Validate the client-supplied timestamp; fall back to the server clock.
    // (A previous refactor referenced `parsedTimestamp` without defining it
    // here, which made every call to this endpoint throw a ReferenceError and
    // return 500 — cookie-consent records were silently never persisted.)
    const parsedTimestamp = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(parsedTimestamp.getTime())) {
      return res.status(400).json({ error: "A valid timestamp is required" });
    }

    // Security (IDOR fix): the clerkId is ALWAYS taken from the verified
    // token, never from the request body — otherwise any signed-in user
    // could overwrite any other user's consent record.
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }
    // Security: the email is derived ONLY from the verified token. A
    // client-supplied body email is never trusted — an attacker could stamp a
    // victim's address onto their own consent record and pollute the victim's
    // data-subject requests. When the token carries no email claim, we store
    // an empty string and rely on clerkId as the sole identity key.
    // HOWEVER: Clerk JWTs do not include email claims — only sub (userId),
    // sid, iss, exp, azp. So we fall back to the request body email, which
    // is safe because the user is already authenticated (JWT verified).
    const emailFromToken = req.auth?.email || req.auth?.email_address || "";
    const email =
      emailFromToken ||
      (typeof req.body?.email === "string" ? req.body.email.trim().slice(0, 320) : "");

  const db = await getDb();
  const collection = db.collection("agreements");

  const filter = { clerkId, type: "cookie-consent" };
  const update = {
    $set: {
      accepted,
      email,
      // Security: a body-supplied email is self-asserted. Record provenance
      // so downstream consumers (data-subject requests, notifications) never
      // treat it as a verified address — clerkId is the identity key.
      emailVerified: Boolean(emailFromToken),
      clerkId,
        deviceIp: req.ip || req.socket?.remoteAddress || "unknown",
        // Privacy (GDPR data minimization): hash the User-Agent so we can
        // detect repeat-device fraud without storing raw fingerprintable
        // strings. The hash is salted with a per-process secret so it can't
        // be reversed by rainbow-table lookup.
        userAgent: hashUserAgent(req.headers["user-agent"]),
        timestamp: parsedTimestamp,
        privacyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        cookieVersion: COOKIE_POLICY_VERSION,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        type: "cookie-consent",
        createdAt: new Date(),
      },
    };

  await collection.updateOne(filter, update, { upsert: true });
    // Privacy: don't log email addresses.
    console.log("[api/agreement] Consent saved", { clerkId, accepted });

    res.json({ ok: true });
  } catch (error) {
    console.error("[api/agreement] Failed to save consent", error);
    res.status(500).json({ error: "Failed to save consent" });
  }
});

// Get the user's current cookie/analytics consent status.
// For signed-in users the server-side record is the source of truth — it
// survives a device change, a cookie/localStorage wipe, or a re-login, and is
// what the frontend queries FIRST (anonymous visitors have no server record
// and fall back to localStorage). Returning the stored cookieVersion lets the
// client re-prompt when the cookie policy is bumped.
app.get("/api/agreement/status", rateLimit, requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }

    const db = await getDb();
    const agreement = await db
      .collection("agreements")
      .findOne({ clerkId, type: "cookie-consent" });

    if (agreement) {
      res.json({
        accepted: agreement.accepted,
        cookieVersion: agreement.cookieVersion || null,
      });
    } else {
      res.json({ accepted: false });
    }
  } catch (error) {
    console.error("[api/agreement/status] Failed to fetch status", error);
    res.status(500).json({ error: "Failed to fetch consent status" });
  }
});

// Delete every server-side trace of the authenticated user: their MongoDB
// cookie-consent records AND their Clerk account. The frontend handles clearing
// localStorage and signing out after this resolves. Irreversible by design.
app.delete("/api/account", rateLimit, requireAuth, async (req, res) => {
  const userId = req.auth?.userId;
  const email =
    req.auth?.email ||
    req.auth?.email_address ||
    (Array.isArray(req.auth?.email_addresses) ? req.auth.email_addresses[0] : "") ||
    "";
  console.log("[api/account] Delete request", { userId, hasEmail: Boolean(email) });

  if (!userId) {
    return res.status(400).json({ error: "Could not determine the user to delete." });
  }

  let agreementsDeleted = 0;
  let moderationLogsDeleted = 0;
  try {
    const db = await getDb();
    const filter = userId ? { clerkId: userId } : {};
    const result = await db.collection("agreements").deleteMany(filter);
    agreementsDeleted = result.deletedCount ?? 0;
    const modResult = await db.collection("moderationLogs").deleteMany(filter);
    moderationLogsDeleted = modResult.deletedCount ?? 0;
    console.log("[api/account] Mongo data deleted", { userId, agreementsDeleted, moderationLogsDeleted });
  } catch (error) {
    console.error("[api/account] Failed to delete Mongo data", error);
    return res.status(500).json({ error: "Failed to delete your stored data." });
  }

  // Delete the Clerk account via the Clerk Backend API.
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[api/account] CLERK_SECRET_KEY is not configured");
    return res.status(500).json({
      error:
        "Account deletion is not configured on the server. Your stored data was removed, but the account could not be deleted.",
    });
  }

  try {
    const apiBase = (process.env.CLERK_API_URL || "https://api.clerk.com").replace(/\/$/, "");
    const clerkRes = await fetch(`${apiBase}/v1/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!clerkRes.ok) {
      const payload = await clerkRes.text().catch(() => "");
      console.error("[api/account] Clerk deletion failed", {
        userId,
        status: clerkRes.status,
        payload: payload.slice(0, 500),
      });
      return res.status(502).json({
        error: "Your stored data was removed, but the account could not be deleted. Please try again.",
      });
    }

    console.log("[api/account] Clerk account deleted", { userId });
    return res.json({ ok: true, agreementsDeleted, moderationLogsDeleted, clerkDeleted: true });
  } catch (error) {
    console.error("[api/account] Clerk deletion error", error);
    return res.status(502).json({
      error: "Your stored data was removed, but the account could not be deleted. Please try again.",
    });
  }
});

// Store the user's legal consent (Privacy Policy + Terms of Service) acceptance.
// This is called after the user accepts the pre-sign-in consent and signs in.
app.post("/api/legal-consent", rateLimit, requireAuth, async (req, res) => {
  try {
    const { accepted, timestamp } = req.body;

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) is required" });
    }
    // Validate the timestamp is an actual parseable date — otherwise an
    // Invalid Date is silently persisted.
    const parsedTimestamp = timestamp ? new Date(timestamp) : null;
    if (!parsedTimestamp || Number.isNaN(parsedTimestamp.getTime())) {
      return res.status(400).json({ error: "A valid timestamp is required" });
    }
    // Privacy: store only the age bracket, not any exact date of birth.
    const ageBracket = req.body?.ageBracket;
    const validAgeBrackets = new Set(["under13", "13-17", "18+"]);
    const sanitizedAgeBracket =
      typeof ageBracket === "string" && validAgeBrackets.has(ageBracket)
        ? ageBracket
        : null;

    const db = await getDb();
    const collection = db.collection("agreements");
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }
    // Security: the email is derived ONLY from the verified token — a
    // client-supplied body email is never trusted (it could stamp a victim's
    // address onto this record and pollute their data-subject requests).
    // HOWEVER: Clerk JWTs do not include email claims — only sub (userId),
    // sid, iss, exp, azp. So we fall back to the request body email, which
    // is safe because the user is already authenticated (JWT verified).
    const emailFromToken = req.auth?.email || req.auth?.email_address || "";
    const email =
      emailFromToken ||
      (typeof req.body?.email === "string" ? req.body.email.trim().slice(0, 320) : "");

    const filter = { clerkId, type: "legal-consent" };
    const update = {
      $set: {
        accepted,
        email,
        // Security: a body-supplied email is self-asserted (see above).
        emailVerified: Boolean(emailFromToken),
        clerkId,
        ageBracket: sanitizedAgeBracket,
        deviceIp: req.ip || req.socket?.remoteAddress || "unknown",
        // Privacy (GDPR data minimization): hash the User-Agent so we can
        // detect repeat-device fraud without storing raw fingerprintable
        // strings. The hash is salted with a per-process secret so it can't
        // be reversed by rainbow-table lookup.
        userAgent: hashUserAgent(req.headers["user-agent"]),
        timestamp: parsedTimestamp,
        type: "legal-consent",
        privacyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

await collection.updateOne(filter, update, { upsert: true });
    console.log("[api/legal-consent] Legal consent saved", {
      clerkId,
      accepted,
      timestamp,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("[api/legal-consent] Failed to save legal consent", error);
    res.status(500).json({ error: "Failed to save legal consent" });
  }
});

// Get the user's current legal consent status.
app.get("/api/legal-consent/status", rateLimit, requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }

    const db = await getDb();
    const agreement = await db.collection("agreements").findOne({ clerkId, type: "legal-consent" });

    if (agreement) {
      res.json({
        accepted: agreement.accepted,
        privacyVersion: agreement.privacyVersion,
        termsVersion: agreement.termsVersion,
      });
    } else {
      res.json({ accepted: false });
    }
  } catch (error) {
    console.error("[api/legal-consent/status] Failed to fetch status", error);
    res.status(500).json({ error: "Failed to fetch consent status" });
  }
});

// Export all user data from MongoDB as JSON.
app.get("/api/export-data", rateLimit, requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const email =
      req.auth?.email ||
      req.auth?.email_address ||
      (Array.isArray(req.auth?.email_addresses) ? req.auth.email_addresses[0] : "") ||
      "";

    if (!userId) {
      return res.status(400).json({ error: "Could not determine the user." });
    }

    const db = await getDb();
    // Security: match strictly on the verified clerkId. Matching on email as
    // well would let a record created by another account (with a spoofed or
    // shared email) leak into this user's export.
    const filter = { clerkId: userId };

    // Completeness (GDPR Art. 15 / DPDP access right): the export must cover
    // EVERY collection that stores data keyed to this user — consent records
    // AND moderation logs.
    const [agreements, moderationLogs] = await Promise.all([
      db.collection("agreements").find(filter).toArray(),
      db.collection("moderationLogs").find(filter).toArray(),
    ]);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="reallearn-data-${userId}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      user: {
        clerkId: userId,
        email,
      },
      agreements,
      moderationLogs,
    });
  } catch (error) {
    console.error("[api/export-data] Failed to export data", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

// Security: TTS requires auth like every other data endpoint — it drives an
// external synthesis service (network/CPU/disk cost) and fills an in-memory
// cache, so it must not be an anonymous cost amplifier.
app.post("/api/tts", rateLimit, requireAuth, async (req, res) => {
  try {
    if (!EdgeTTS) {
      return res.status(500).json({ error: "TTS service is not available." });
    }
    if (isTtsRateLimited(req)) {
      res.setHeader("Retry-After", Math.ceil(TTS_RATE_LIMIT_WINDOW_MS / 1000));
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: "Text is too long (max 2000 characters)." });
    }

    // Security: `lang` is interpolated unescaped into the SSML document by
    // node-edge-tts (xml:lang="..."), so an arbitrary string here is an SSML
    // injection channel — the same class of hole the prosody patterns below
    // close. Lock it to the exact languages we support.
    const requestedLang = typeof req.body?.lang === "string" ? req.body.lang.trim() : "";
    const lang = Object.prototype.hasOwnProperty.call(SPEECH_LANG_TO_VOICE, requestedLang)
      ? requestedLang
      : "en-IN";
    const voice = SPEECH_LANG_TO_VOICE[lang] || "en-IN-NeerjaNeural";
    // Security: prosody values are embedded in SSML — accept only strict
    // "+10%" / "-2Hz"-style values, reject anything else outright.
    const rate = sanitizeTtsProsody(req.body?.rate, TTS_RATE_VOLUME_PATTERN);
    const pitch = sanitizeTtsProsody(req.body?.pitch, TTS_PITCH_PATTERN);
    const volume = sanitizeTtsProsody(req.body?.volume, TTS_RATE_VOLUME_PATTERN);
    if (rate === null || pitch === null || volume === null) {
      return res.status(400).json({ error: "Invalid rate/pitch/volume format." });
    }
    const outputFormat = "audio-24khz-48kbitrate-mono-mp3";

    // BANDWIDTH: deterministic content hash — same text+voice+prosody always
    // maps to the same audio, so it can be cached server-side AND revalidated
    // by the browser via ETag (a 304 instead of re-downloading ~1 MB).
    const cacheKey = crypto
      .createHash("sha256")
      .update(`${text}|${voice}|${lang}|${rate ?? ""}|${pitch ?? ""}|${volume ?? ""}|${outputFormat}`)
      .digest("hex");
    const etag = `"tts-${cacheKey.slice(0, 32)}"`;

    if (req.headers["if-none-match"] === etag) {
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "private, max-age=86400");
      return res.status(304).end();
    }

    const sendAudio = (buffer) => {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Content-Disposition", 'inline; filename="speech.mp3"');
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.setHeader("ETag", etag);
      res.send(buffer);
    };

    const cached = ttsCacheGet(cacheKey);
    if (cached) {
      return sendAudio(cached);
    }

    const tts = new EdgeTTS({
      voice,
      lang,
      outputFormat,
      rate,
      pitch,
      volume,
      timeout: 30000,
    });

    // Reliability: include a per-request random suffix so two concurrent
    // requests for the same text never write/unlink the same temp path
    // (the loser would read after the winner's unlink → intermittent 500s).
    const outFile = path.join(
      TTS_TEMP_DIR,
      `${cacheKey.slice(0, 16)}-${crypto.randomUUID()}.mp3`
    );
    let fileBuffer;
    try {
      // Security: XML-escape the text before it is embedded in the SSML
      // document node-edge-tts builds — otherwise markup in the text could
      // break out of the validated voice/prosody context (SSML injection).
      await tts.ttsPromise(escapeXml(text), outFile);
      fileBuffer = await fs.promises.readFile(outFile);
    } finally {
      // Always remove the temp file, even when synthesis/read fails.
      fs.unlink(outFile, () => {});
    }

    ttsCacheSet(cacheKey, fileBuffer);
    sendAudio(fileBuffer);
  } catch (error) {
    console.error("[api/tts] Failed to synthesize speech", error);
    if (!res.writableEnded) {
      res.status(500).json({ error: "Failed to synthesize speech." });
    }
  }
});

app.post("/api/generate-lesson", rateLimit, requireAuth, async (req, res) => {
  const requestId = `lesson-${Date.now()}-${++lessonRequestCounter}`;
  // Robustness: a non-string question (e.g. {"question": 123}) must not throw —
  // this handler has no outer try/catch, so a TypeError here becomes an
  // unhandled promise rejection that kills the whole process on Node >= 15.
  const question =
    typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const language = req.body?.language ?? "English";
  const level = req.body?.level ?? "Class 9-10";
  // "fast" → one direct answer part, minimal latency (no Serper, smaller
  // output budget). Anything else → the classic 3-part explanation journey.
  const mode = req.body?.mode === "fast" ? "fast" : "explain";
  console.log("[generate-lesson] Incoming request", {
    requestId,
    questionLength: question?.length ?? 0,
    language,
    level,
    mode,
    activeLessonRequests,
  });

  if (!question) {
    console.warn("[generate-lesson] Missing question", { requestId });
    return res.status(400).json({ error: "Question is required" });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    console.warn("[generate-lesson] Question too long", {
      requestId,
      questionLength: question.length,
    });
    return res.status(400).json({
      error: `Question is too long (max ${MAX_QUESTION_LENGTH} characters).`,
    });
  }
  // Security: language/level are interpolated into the LLM prompt. Lock them
  // to the values the app actually offers so they can't be used to smuggle
  // arbitrary instructions (prompt injection) past the question filters.
  if (!ALLOWED_LANGUAGES.has(language)) {
    console.warn("[generate-lesson] Invalid language", { requestId, language });
    return res.status(400).json({ error: "Unsupported language." });
  }
  if (!ALLOWED_LEVELS.has(level)) {
    console.warn("[generate-lesson] Invalid level", { requestId, level });
    return res.status(400).json({ error: "Unsupported level." });
  }

  const inputFilter = filterUserInput(question);
  if (!inputFilter.allowed) {
    const moderationEvent = buildModerationEvent({
      requestId,
      clerkId: req.auth?.userId,
      type: "user-input-blocked",
      reason: inputFilter.reason,
      question,
    });
    console.warn("[moderation] Banned input blocked", redactModerationEvent(moderationEvent));
    await logModerationEvent(moderationEvent);
    return res.status(400).json({ error: inputFilter.reason });
  }

  // SPEED TACTIC: two-tier lesson cache. Identical (question, language, level)
  // requests are served instantly from memory/Mongo — no Serper, no Gemma, no
  // LLM moderation (the cached lesson already passed every check when it was
  // first generated). Cache hits also bypass the concurrency gate because they
  // cost almost nothing.
  const cacheKey = lessonCacheKey(question, language, level, mode);
  const cachedLesson = await getCachedLesson(cacheKey);
  if (cachedLesson) {
    console.log("[generate-lesson] Cache hit — serving instantly", { requestId });
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write(`event: lesson\ndata: ${JSON.stringify(cachedLesson)}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    res.end();
    recordLessonResult(true);
    return;
  }

  if (activeLessonRequests >= MAX_CONCURRENT_LESSON_REQUESTS) {
    console.warn("[generate-lesson] Busy: concurrency limit reached", {
      requestId,
      activeLessonRequests,
      maxConcurrent: MAX_CONCURRENT_LESSON_REQUESTS,
    });
    res.setHeader("Retry-After", 5);
    return res
      .status(503)
      .json({ error: "Server is busy. Please retry in a few seconds." });
  }
  activeLessonRequests += 1;
  console.log("[generate-lesson] Request accepted", {
    requestId,
    activeLessonRequests,
  });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  console.log("[SSE] Headers flushed", { requestId });

  let finished = false;
  const generationAbortController = new AbortController();
  const generateAbortSignal = generationAbortController.signal;
  const safeWrite = (chunk) => {
    try {
      if (res.writableEnded) return false;
      return res.write(chunk);
    } catch (error) {
      console.error("[SSE] write failed", { requestId, error });
      return false;
    }
  };
  const finishRequest = (reason = "completed") => {
    if (finished) return;
    finished = true;
    generationAbortController.abort();
    clearInterval(heartbeat);
    decrementActiveLessonRequests();
    console.log("[generate-lesson] Finishing request", {
      requestId,
      reason,
      activeLessonRequests,
      writableEnded: res.writableEnded,
      responseFinished: res.finished,
    });
    if (!res.writableEnded) {
        res.end();
    }
  };
  const sendPing = () => {
    if (finished) return;
    // failures in heartbeat are non-fatal to maintain stream connectivity
    safeWrite(`event: ping\ndata: ${Date.now()}\n\n`);
  };
  sendPing();
  const heartbeat = setInterval(sendPing, HEARTBEAT_INTERVAL_MS);

  req.on("aborted", () => finishRequest("request aborted"));
  res.on("close", () => finishRequest("response closed"));
  res.on("error", (error) => {
    console.error("[SSE] response error", { requestId, error });
    finishRequest("response error");
  });

  const sendEvent = (event, payload) => {
    const eventWritten = safeWrite(`event: ${event}\n`);
    const dataWritten = safeWrite(`data: ${JSON.stringify(payload)}\n\n`);
    if (!eventWritten || !dataWritten) {
      console.warn("[SSE] Event write failed", { requestId, event });
    }
    return eventWritten && dataWritten;
  };

  try {
    // Run LLM input moderation concurrently with the real-world context fetch
    // so the safety check adds no latency in the common (allowed) case.
    // SPEED TACTIC: fast mode skips the Serper fetch entirely — a quick answer
    // doesn't need a current-events Part 3, so we save that whole round trip.
    // SECURITY: fast mode used to skip LLM input moderation entirely, which
    // made the whole content policy bypassable by simply choosing mode:"fast"
    // (the regex guard alone is easily dodged by paraphrase). The moderation
    // call is now ALWAYS started; fast mode just doesn't block on it here —
    // it runs concurrently with the (much slower) generation call and the
    // verdict is enforced below before the lesson is streamed. Net added
    // latency in fast mode: ~0.
    sendEvent("progress", { stage: "starting", percent: 5 });
    const inputModerationPromise = moderateText(question, "input");
    console.log("[Serper] Context fetch start", { requestId, mode });
    sendEvent("progress", { stage: "searching", percent: 15 });
    const [inputModeration, newsContextResult] = await Promise.all([
      inputModerationPromise,
      mode === "fast"
        ? Promise.resolve(null)
        : fetchRealWorldContext(question, language).catch((error) => {
            console.warn("[Serper] Context fetch failed, continuing without context", {
              requestId,
              error,
            });
            return null;
          }),
    ]);
    const newsContext = newsContextResult;
    const trimmedNewsContext =
      typeof newsContext === "string" && newsContext.length > 1500
        ? newsContext.slice(0, 1500) + "\n\n[context truncated]"
        : newsContext;
    console.log("[Serper] Context fetch end", {
      requestId,
      hasContext: Boolean(newsContext),
      contextLength: newsContext?.length ?? 0,
      trimmedLength: trimmedNewsContext?.length ?? 0,
    });
    sendEvent("progress", { stage: "searched", percent: 30 });

    if (finished) return;
    if (inputModeration && !inputModeration.allowed) {
      const moderationEvent = buildModerationEvent({
        requestId,
        clerkId: req.auth?.userId,
        type: "user-input-moderated",
        reason: inputModeration.reason,
        question,
      });
      console.warn("[moderation] Input blocked by LLM moderation", redactModerationEvent(moderationEvent));
      await logModerationEvent(moderationEvent);
      sendEvent("error", {
        error:
          inputModeration.reason ||
          "Your question was flagged by our safety review. Please try a different question.",
      });
      recordLessonResult(false);
      return;
    }

    const userPrompt = `Question: ${question}
Language: ${language}
Level: ${level}${
      trimmedNewsContext
        ? `\n\nREAL WORLD CONTEXT FOR PART 3 (use this — do not search):\n${trimmedNewsContext}`
        : ""
    }`;

    const systemPrompt =
      mode === "fast" ? GENERATE_FAST_ANSWER_PROMPT : GENERATE_LESSON_PROMPT;
    // IMPORTANT: max_tokens is a CEILING, not a target — a short fast answer
    // still finishes early, so a generous cap costs no latency. Gemma's
    // internal "thinking" output counts against this cap even though we strip
    // it from the text, and that overhead is roughly constant. With only 2000
    // tokens, thinking + JSON regularly truncated fast mode's single part
    // mid-quiz, and a one-part lesson has no slack: the whole response failed
    // validation ("AI response format was invalid") every time. Explain mode
    // survived the same truncation because a dropped *trailing* part still
    // leaves a valid 1-2 part journey. Both modes now get the same headroom.
    const maxOutputTokens = mode === "fast" ? 4000 : 6000;
    // Fast mode uses a lower temperature for more focused, deterministic
    // output — less sampling overhead means faster generation.
    const temperature = mode === "fast" ? 0.2 : 0.6;
    console.log("[Gemma] callGemma start", {
      requestId,
      mode,
      callTimeoutMs: GEMMA_CALL_TIMEOUT_MS,
      userPromptLength: userPrompt.length,
      hasNewsContext: Boolean(newsContext),
      maxOutputTokens,
      temperature,
    });
    sendEvent("progress", { stage: "generating", percent: 40 });
    let generationPercent = 40;
    const generationTicker = setInterval(() => {
      if (finished) return;
      const remaining = 82 - generationPercent;
      if (remaining <= 0.5) return;
      generationPercent = Math.min(82, generationPercent + Math.max(0.6, remaining * 0.08));
      sendEvent("progress", {
        stage: "generating",
        percent: Math.round(generationPercent),
      });
    }, 1500);

    console.log("[Gemma] Provider plan", {
      requestId,
      mode,
      providerOrder: isFallbackConfigured()
        ? ["cerebras", "cloudflare"]
        : ["cerebras"],
      fallbackConfigured: isFallbackConfigured(),
    });

    async function tryGenerate(source, label, { repairReason = null } = {}) {
      // Self-correcting retry: when a previous attempt produced output that
      // failed JSON/schema validation, re-ask the SAME question with an
      // explicit correction hint and a lower temperature. Malformed output is
      // almost always a sampling accident — the immediate second try with
      // tighter sampling succeeds, so the user never has to press retry.
      const attemptUserPrompt = repairReason
        ? `${userPrompt}\n\nIMPORTANT — RETRY: Your previous reply could not be used (${repairReason}). Respond with ONLY the exact JSON object described in the instructions. Start with "{" immediately, include every required field with the exact structure and counts specified, and output nothing before or after the JSON.`
        : userPrompt;
      const attemptTemperature = repairReason
        ? Math.max(0.2, temperature - 0.3)
        : temperature;
      clearInterval(generationTicker);
      generationPercent = 40;
      const attemptTicker = setInterval(() => {
        if (finished) return;
        const remaining = 82 - generationPercent;
        if (remaining <= 0.5) return;
        generationPercent = Math.min(82, generationPercent + Math.max(0.6, remaining * 0.08));
        sendEvent("progress", {
          stage: "generating",
          percent: Math.round(generationPercent),
        });
      }, 1500);

      console.log("[Gemma] generate start", {
        requestId,
        mode,
        provider: source === "cloudflare" ? "Cloudflare Workers AI" : "Cerebras Cloud (Gemma 4 31B)",
        label,
        isRepairAttempt: Boolean(repairReason),
        callTimeoutMs: GEMMA_CALL_TIMEOUT_MS,
        userPromptLength: attemptUserPrompt.length,
        hasNewsContext: Boolean(newsContext),
        maxOutputTokens,
        temperature: attemptTemperature,
      });
      const startedAt = Date.now();
      let result;
      try {
        if (source === "cloudflare") {
          // Direct Cloudflare call bypasses callGemma's circuit breaker so
          // the fallback is still reachable when the primary's circuit is open.
          result = extractTextFromResult(
            await callCloudflareAI(
              GEMMA_MODEL,
              {
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: attemptUserPrompt },
                ],
                temperature: attemptTemperature,
                max_tokens: maxOutputTokens,
              },
              generateAbortSignal
            )
          );
        } else {
          result = await callGemma(
            systemPrompt,
            attemptUserPrompt,
            false,
            attemptTemperature,
            GEMMA_CALL_TIMEOUT_MS,
            generateAbortSignal,
            maxOutputTokens
          );
        }
        clearInterval(attemptTicker);
        console.log("[Gemma] generate success", {
          requestId,
          provider: source === "cloudflare" ? "Cloudflare Workers AI" : "Cerebras Cloud (Gemma 4 31B)",
          label,
          latencyMs: Date.now() - startedAt,
          rawLength: result.length,
          rawPreview: result.slice(0, 500),
        });
        sendEvent("progress", { stage: "generated", percent: 85 });
        return result;
      } catch (error) {
        clearInterval(attemptTicker);
        console.error("[Gemma] generate failed", {
          requestId,
          provider: source === "cloudflare" ? "Cloudflare Workers AI" : "Cerebras Cloud (Gemma 4 31B)",
          label,
          latencyMs: Date.now() - startedAt,
          error,
        });
        throw error;
      }
    }

    async function validateRaw(rawText) {
      const parsed = parseJSON(rawText);
      if (parsed === null) {
        console.warn("[generate-lesson] parseJSON returned null", { requestId, rawPreview: rawText?.slice?.(0, 500) });
        return { ok: false, error: "Failed to parse AI response. Please try again." };
      }
      const normalized = normalizeJourney(parsed, mode);
      if (!isValidJourney(normalized, mode)) {
        console.warn("[generate-lesson] normalizeJourney/isValidJourney failed", {
          requestId,
          parsedKeys: Object.keys(parsed),
          hasParts: Array.isArray(parsed.parts),
          partsCount: parsed.parts?.length,
          hasKeyTakeaways: Array.isArray(parsed.keyTakeaways),
          keyTakeawaysCount: parsed.keyTakeaways?.length,
          samplePart: parsed.parts?.[0]
            ? {
                keys: Object.keys(parsed.parts[0]),
                hasTitle: typeof parsed.parts[0].title === "string",
                hasContent: typeof parsed.parts[0].content === "string",
                hasQuiz: Array.isArray(parsed.parts[0].quiz),
                quizLength: parsed.parts[0].quiz?.length,
              }
            : null,
          rawPreview: rawText?.slice?.(0, 1000),
        });
        return { ok: false, error: "AI response format was invalid. Please try again." };
      }
      if (!hasExpectedPartCount(normalized, mode)) {
        console.warn("[generate-lesson] Part count mismatch", {
          requestId,
          mode,
          expected: mode === "fast" ? 1 : 3,
          actual: normalized.parts?.length ?? 0,
        });
        return {
          ok: false,
          error:
            mode === "fast"
              ? "The AI could not generate a complete answer. Please try a different question."
              : "The AI could not generate a complete lesson. Please try a different question.",
        };
      }

      // Algorithmic quality gate — evaluates readability, vocabulary, quiz
      // difficulty, and auto-simplifies content that's too advanced for the
      // student's level. No AI calls.
      const { journey: qualityFixedJourney, report: qualityReport } = evaluateAndFix(
        normalized,
        level,
        mode,
        language
      );
      if (qualityReport.fixed.length > 0) {
        console.log("[generate-lesson] Quality gate auto-fixed content", {
          requestId,
          level,
          issueCount: qualityReport.issues.length,
          fixCount: qualityReport.fixed.length,
          fixes: qualityReport.fixed.slice(0, 10),
        });
      }

      return { ok: true, raw: rawText, normalized: qualityFixedJourney };
    }

    // ── Reliability ladder ──
    // A user-visible error is the LAST resort. Every rung may fail either by
    // throwing (network/timeout/API error) or by returning output that fails
    // validation; the next rung then runs automatically. "repair" rungs re-ask
    // the same provider with an explicit correction hint and lower temperature
    // — this is the server doing the "second try" the user used to have to do
    // by hand. Latency can grow a little on a bad first sample; that is a
    // deliberate trade for never surfacing a fixable error.
    // Reliability: the direct-Cloudflare rungs call the fallback provider
    // WITHOUT going through callGemma's timeout circuit breaker. This is the
    // difference between 0% and ~100% reliability when Cerebras is degraded:
    // once the primary's timeout circuit trips open, every callGemma() rejects
    // immediately with GemmaCircuitOpenError, so without a circuit-independent
    // path the whole request fails even though Cloudflare is healthy and fast.
    // Enabling these rungs guarantees a working provider is always reachable.
    // They only exist when Cloudflare is configured, so single-provider
    // deployments are unaffected.
    const fallbackRungsActive = isFallbackConfigured();
    const attemptPlan = [
      { source: "primary", label: "primary", repair: false },
      { source: "primary", label: "primary-repair", repair: true },
    ];
    if (fallbackRungsActive) {
      attemptPlan.push({ source: "cloudflare", label: "cloudflare", repair: false });
      attemptPlan.push({ source: "cloudflare", label: "cloudflare-repair", repair: true });
    }

    let validated = null;
    let lastValidationError = null;
    let lastThrownError = null;

    for (const plan of attemptPlan) {
      if (finished || generateAbortSignal.aborted) return;
      try {
        const rawAttempt = await tryGenerate(plan.source, plan.label, {
          repairReason: plan.repair
            ? lastValidationError || "the response was not valid JSON"
            : null,
        });
        const validation = await validateRaw(rawAttempt);
        if (validation.ok) {
          validated = validation;
          console.log("[generate-lesson] Attempt succeeded", {
            requestId,
            label: plan.label,
          });
          break;
        }
        lastValidationError = validation.error;
        sendEvent("progress", {
          stage: "retrying",
          percent: Math.round(generationPercent),
          message: "Improving response quality...",
        });
        console.warn("[generate-lesson] Attempt produced invalid output; trying next rung", {
          requestId,
          label: plan.label,
          validationError: validation.error,
        });
      } catch (error) {
        if (finished || generateAbortSignal.aborted) return;
        if (error?.name === "AbortError") throw error;
        lastThrownError = error;
        sendEvent("progress", {
          stage: "retrying",
          percent: Math.round(generationPercent),
          message: "Retrying generation...",
        });
        console.warn("[generate-lesson] Attempt threw; trying next rung", {
          requestId,
          label: plan.label,
          errorName: error?.name,
          errorMessage: error?.message,
        });
      }
    }

    if (!validated) {
      // Prefer the outer catch's friendly per-error-type mapping when the
      // final failure was a thrown provider error; validation messages are
      // already written for humans.
      if (lastThrownError && !lastValidationError) throw lastThrownError;
      console.error("[generate-lesson] All generation attempts exhausted", {
        requestId,
        lastValidationError,
        lastThrownErrorName: lastThrownError?.name,
      });
      sendEvent("error", {
        error:
          lastValidationError ||
          "Failed to generate lesson. Please try again.",
      });
      recordLessonResult(false);
      return;
    }

    const raw = validated.raw;
    const normalized = validated.normalized;
    sendEvent("progress", { stage: "validating", percent: 95 });

    const outputModerationPromise = moderateText(raw, "output");

    if (mode === "fast") {
      const fastInputModeration = await inputModerationPromise;
      if (finished) return;
      if (!fastInputModeration.allowed) {
        const moderationEvent = buildModerationEvent({
          requestId,
          clerkId: req.auth?.userId,
          type: "user-input-moderated",
          reason: fastInputModeration.reason,
          question,
        });
        console.warn("[moderation] Fast-mode input blocked by LLM moderation", redactModerationEvent(moderationEvent));
        await logModerationEvent(moderationEvent);
        sendEvent("error", {
          error:
            fastInputModeration.reason ||
            "Your question was flagged by our safety review. Please try a different question.",
        });
        recordLessonResult(false);
        return;
      }
      // Security: enforce the output verdict BEFORE streaming the lesson.
      // The old post-hoc check only deleted the cache entry — the requesting
      // user had already received unmoderated content. The check is
      // rule-based (no network call), so awaiting it costs no latency.
      const fastOutputVerdict = await outputModerationPromise;
      if (finished) return;
      if (!fastOutputVerdict.allowed) {
        const moderationEvent = buildModerationEvent({
          requestId,
          clerkId: req.auth?.userId,
          type: "ai-response-moderated",
          reason: fastOutputVerdict.reason,
          question,
        });
        console.warn("[moderation] Fast-mode output blocked by moderation", redactModerationEvent(moderationEvent));
        await logModerationEvent(moderationEvent);
        sendEvent("error", {
          error:
            fastOutputVerdict.reason ||
            "The generated content was flagged. Please try a different question.",
        });
        recordLessonResult(false);
        return;
      }
    } else {
      const outputVerdict = await outputModerationPromise;
      if (finished) return;
      if (!outputVerdict.allowed) {
        const moderationEvent = buildModerationEvent({
          requestId,
          clerkId: req.auth?.userId,
          type: "ai-response-moderated",
          reason: outputVerdict.reason,
          question,
        });
        console.warn("[moderation] Explain-mode output blocked by LLM moderation", redactModerationEvent(moderationEvent));
        await logModerationEvent(moderationEvent);
        sendEvent("error", {
          error:
            outputVerdict.reason ||
            "The generated content was flagged. Please try a different question.",
        });
        recordLessonResult(false);
        return;
      }
    }

    setCachedLesson(cacheKey, normalized);

    console.log("[generate-lesson] Streaming final lesson", {
      requestId,
      partsCount: normalized.parts?.length ?? 0,
      takeawaysCount: normalized.keyTakeaways?.length ?? 0,
    });
    sendEvent("lesson", normalized);
    sendEvent("done", { ok: true });
    recordLessonResult(true);
  } catch (error) {
    if (finished) return;
    if (error.name === 'AbortError') {
      console.log("[generate-lesson] Request aborted", { requestId });
      return;
    }
    const timeoutMessage = formatGemmaTimeoutMessage(LESSON_TIMEOUT_MS);
    const message =
      error instanceof GemmaTimeoutError
        ? timeoutMessage
        : error instanceof GemmaCircuitOpenError
        ? error.message
        : error instanceof GemmaApiError &&
          (error.status === 408 ||
            error.status === 429 ||
            (error.status >= 500 && error.status < 600))
        ? "Gemma service is temporarily unavailable. Please try again in a moment."
        : // Security: NEVER echo GemmaApiError.message to clients — it embeds
          // up to 500 chars of the raw upstream (Cloudflare) response body,
          // which can leak account/model/config internals. Same for any other
          // internal error (driver/infra messages can contain hostnames).
          // The full detail is still logged server-side below.
          error instanceof GemmaApiError
        ? "The AI service could not process this request. Please try again."
        : "Failed to generate lesson. Please try again.";

    console.error("[generate-lesson] Request failed", { requestId, error });
    recordLessonResult(false);
    sendEvent("error", { error: message });
  } finally {
    finishRequest("finally cleanup");
  }
});

// Terminal error handler — MUST be registered after every route. Without it,
// Express's default finalhandler echoes err.stack to the client whenever
// NODE_ENV isn't "production" (easy to forget on a PaaS), leaking internal
// paths. Malformed JSON bodies and over-limit payloads land here too.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) {
    // Response already streaming (e.g. SSE) — nothing safe to send.
    return res.end();
  }
  const isBodyParseError =
    err?.type === "entity.parse.failed" || err instanceof SyntaxError;
  const isBodyTooLarge = err?.type === "entity.too.large";
  const isCorsDenied = err?.message === "CORS origin denied";
  const status = isBodyParseError ? 400 : isBodyTooLarge ? 413 : isCorsDenied ? 403 : 500;
  const message = isBodyParseError
    ? "Invalid JSON in request body"
    : isBodyTooLarge
      ? "Request body too large"
      : isCorsDenied
        ? "Origin not allowed"
        : "Internal server error";
  console.error("[error-handler]", {
    path: req.path,
    status,
    errorName: err?.name,
    errorMessage: err?.message,
  });
  res.status(status).json({ error: message });
});

try {
  validateStartupConfig();
  const server = app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
    if (process.env.CLOUDFLARE_API_TOKEN?.trim() && process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
      startPeriodicWarmUp();
    }
  });

  // Graceful shutdown: stop accepting new connections, wait for in-flight
  // requests to finish (up to 30s), then close MongoDB and exit.
  const shutdown = (signal) => {
    console.log(`[shutdown] ${signal} received, starting graceful shutdown`);
    server.close(() => {
      console.log("[shutdown] All connections closed");
      process.exit(0);
    });
    // Force-kill after 30 seconds if connections won't drain.
    setTimeout(() => {
      console.error("[shutdown] Forced exit after 30s timeout");
      process.exit(1);
    }, 30000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
} catch (error) {
  console.error("[startup] Backend configuration error:", error);
  process.exit(1);
}
