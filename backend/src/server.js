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
  formatGemmaTimeoutMessage,
  GemmaTimeoutError,
  GemmaApiError,
  GemmaCircuitOpenError,
  parseJSON,
} from "./lib/gemma.js";
import {
  GENERATE_LESSON_PROMPT,
  GENERATE_FAST_ANSWER_PROMPT,
} from "./lib/prompts.js";
import { fetchRealWorldContext } from "./lib/serper.js";
import { isValidJourney, normalizeJourney } from "./validation.js";
import { getDb } from "./lib/mongodb.js";
import {
  requireAuth,
  extractBearerToken,
  inspectToken,
  verifyClerkToken,
} from "./lib/auth.js";
import {
  filterAIResponse,
  filterUserInput,
} from "./lib/contentGuard.js";
import { moderateText } from "./lib/moderation.js";
import {
  lessonCacheKey,
  getCachedLesson,
  setCachedLesson,
} from "./lib/lessonCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      const ip = req.ip || req.connection?.remoteAddress || "unknown";
      const token = extractBearerToken(req);
      // Hash the WHOLE token. A prefix of a JWT is just the base64 header,
      // which is identical for every user.
      const tokenLimited = token
        ? hit(
            `user:${crypto.createHash("sha256").update(token).digest("hex").slice(0, 32)}`,
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

const PRIVACY_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || "1.5";
const TERMS_OF_SERVICE_VERSION = process.env.TERMS_OF_SERVICE_VERSION || "1.5";

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
const configuredLessonTimeoutMs = Number(process.env.LESSON_TIMEOUT_MS);
const LESSON_TIMEOUT_MS =
  Number.isFinite(configuredLessonTimeoutMs) && configuredLessonTimeoutMs > 0
    ? Math.max(configuredLessonTimeoutMs, MIN_LESSON_TIMEOUT_MS)
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
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15000;
const MAX_HEARTBEAT_INTERVAL_MS = 55000;
const configuredHeartbeatIntervalMs = Number(process.env.SSE_HEARTBEAT_INTERVAL_MS);
const HEARTBEAT_INTERVAL_MS =
  Number.isFinite(configuredHeartbeatIntervalMs) && configuredHeartbeatIntervalMs > 0
    ? Math.min(configuredHeartbeatIntervalMs, MAX_HEARTBEAT_INTERVAL_MS)
    : DEFAULT_HEARTBEAT_INTERVAL_MS;
const DEFAULT_MAX_CONCURRENT_LESSON_REQUESTS = 3;
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
  const hasCloudflareConfig = Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  );
  if (!hasCloudflareConfig) {
    throw new Error(
      "Missing required environment variables: set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID"
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

async function logModerationEvent(event) {
  try {
    const db = await getDb();
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
  // SECURITY: a null/undefined origin arrives from file://, privacy redirects,
  // or some cross-origin POST requests. Reject it — only the explicit allow-
  // list passes. Previously `!origin` returned true, letting any opaque origin
  // through CORS.
  if (!origin) return false;
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
    allowedHeaders: ["Content-Type", "Authorization"],
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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Diagnostic endpoint: send the Clerk token as a Bearer header and it reports
// exactly why verification passes/fails (issuer, expiry, trust). No secrets
// leaked — only non-sensitive claim metadata. Security: disabled in
// production unless AUTH_DEBUG_ENABLED=true (it is an unauthenticated
// token-verification oracle), and always rate limited.
app.get("/api/auth-debug", rateLimit, async (req, res) => {
  // Security: this is an unauthenticated token-verification oracle. It must
  // be OFF unless explicitly enabled or running in local development —
  // "NODE_ENV !== production" left it wide open on any host that forgot to
  // set NODE_ENV.
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
    const { accepted, email: bodyEmail, timestamp } = req.body;

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) is required" });
    }

    // Security (IDOR fix): the clerkId is ALWAYS taken from the verified
    // token, never from the request body — otherwise any signed-in user
    // could overwrite any other user's consent record.
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }
    // Security: prefer the VERIFIED token email over the client-supplied one.
    // If the body email won, a user could stamp someone else's address onto
    // their own consent record, which would then leak into that person's
    // /api/export-data results (the export filter matches on email).
    const email =
      req.auth?.email ||
      req.auth?.email_address ||
      (typeof bodyEmail === "string" && bodyEmail.length <= 320 ? bodyEmail.trim() : "") ||
      "";
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

  const db = await getDb();
  const collection = db.collection("agreements");

  const filter = { clerkId, type: "cookie-consent" };
  // Validate timestamp to prevent storing Invalid Date
  const parsedTimestamp = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return res.status(400).json({ error: "Invalid timestamp" });
  }
  const update = {
    $set: {
      accepted,
      email,
      clerkId,
      deviceIp: req.ip || req.connection?.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      timestamp: parsedTimestamp,
      privacyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: TERMS_OF_SERVICE_VERSION,
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
    const { accepted, timestamp, email: bodyEmail } = req.body;

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) is required" });
    }
    // Validate the timestamp is an actual parseable date — otherwise an
    // Invalid Date is silently persisted.
    const parsedTimestamp = timestamp ? new Date(timestamp) : null;
    if (!parsedTimestamp || Number.isNaN(parsedTimestamp.getTime())) {
      return res.status(400).json({ error: "A valid timestamp is required" });
    }

    const db = await getDb();
    const collection = db.collection("agreements");
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(400).json({ error: "Could not determine the authenticated user" });
    }
    // Security: prefer the VERIFIED token email; only fall back to a sane
    // string body email when the token carries none. A client-supplied email
    // that won here could stamp someone else's address onto this record and
    // leak it into that person's /api/export-data results.
    const email =
      req.auth?.email ||
      req.auth?.email_address ||
      (typeof bodyEmail === "string" && bodyEmail.length <= 320 ? bodyEmail : "") ||
      "";

    const filter = { clerkId, type: "legal-consent" };
    const update = {
      $set: {
        accepted,
        email,
        clerkId,
        deviceIp: req.ip || req.connection?.remoteAddress || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
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
    const filter = email ? { $or: [{ clerkId: userId }, { email }] } : { clerkId: userId };

    const [agreements] = await Promise.all([
      db.collection("agreements").find(filter).toArray(),
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
    });
  } catch (error) {
    console.error("[api/export-data] Failed to export data", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

app.post("/api/tts", rateLimit, async (req, res) => {
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

    const outFile = path.join(TTS_TEMP_DIR, `${cacheKey.slice(0, 16)}.mp3`);
    let fileBuffer;
    try {
      await tts.ttsPromise(text, outFile);
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
    const moderationEvent = {
      timestamp: new Date().toISOString(),
      requestId,
      clerkId: req.auth?.userId || null,
      reason: inputFilter.reason,
      type: "user-input-blocked",
    };
    console.warn("[moderation] Banned input blocked", moderationEvent);
    try {
      const db = await getDb();
      await db.collection("moderationLogs").insertOne(moderationEvent);
    } catch (error) {
      console.error("[moderation] Failed to log moderation event", error);
    }
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
  const safeWrite = (chunk) => {
    try {
      if (res.writableEnded || res.finished) return false;
      return res.write(chunk);
    } catch (error) {
      console.error("[SSE] write failed", { requestId, error });
      return false;
    }
  };
  const finishRequest = (reason = "completed") => {
    if (finished) return;
    finished = true;
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
    // SPEED TACTIC: fast mode also skips LLM input moderation — the regex
    // contentGuard already ran and catches genuinely harmful patterns. The LLM
    // moderation adds 4-8 s of latency which defeats the purpose of "fast".
    console.log("[Serper] Context fetch start", { requestId, mode });
    const [inputModeration, newsContextResult] = await Promise.all([
      mode === "fast"
        ? Promise.resolve({ allowed: true })
        : moderateText(question, "input"),
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
    console.log("[Serper] Context fetch end", {
      requestId,
      hasContext: Boolean(newsContext),
      contextLength: newsContext?.length ?? 0,
    });

    if (finished) return;
    if (!inputModeration.allowed) {
      const moderationEvent = {
        timestamp: new Date().toISOString(),
        requestId,
        clerkId: req.auth?.userId || null,
        reason: inputModeration.reason,
        type: "user-input-moderated",
      };
      console.warn("[moderation] Input blocked by LLM moderation", moderationEvent);
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
      newsContext
        ? `\n\nREAL WORLD CONTEXT FOR PART 3 (use this — do not search):\n${newsContext}`
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
    const maxOutputTokens = 4000;
    // Fast mode uses a lower temperature for more focused, deterministic
    // output — less sampling overhead means faster generation.
    const temperature = mode === "fast" ? 0.2 : 0.6;
    console.log("[Gemma] callGemma start", {
      requestId,
      mode,
      lessonTimeoutMs: LESSON_TIMEOUT_MS,
      userPromptLength: userPrompt.length,
      hasNewsContext: Boolean(newsContext),
      maxOutputTokens,
      temperature,
    });
    const raw = await callGemma(
      systemPrompt,
      userPrompt,
      false,
      temperature,
      LESSON_TIMEOUT_MS,
      null,
      maxOutputTokens
    );
    console.log("[Gemma] callGemma success", {
      requestId,
      rawLength: raw.length,
      rawPreview: raw.slice(0, 500),
    });

    // SPEED TACTIC: kick off the LLM output-moderation call immediately and
    // let it run concurrently with the regex guard, JSON parsing, and schema
    // validation below instead of blocking each step in sequence. moderateText
    // never rejects (it fails open), so the floating promise is safe.
    const outputModerationPromise = moderateText(raw, "output");

    const responseFilter = filterAIResponse(raw);
    if (!responseFilter.allowed) {
      const moderationEvent = {
        timestamp: new Date().toISOString(),
        requestId,
        clerkId: req.auth?.userId || null,
        reason: responseFilter.reason,
        type: "ai-response-blocked",
      };
      console.warn("[moderation] Banned AI response blocked", moderationEvent);
      try {
        const db = await getDb();
        await db.collection("moderationLogs").insertOne(moderationEvent);
      } catch (error) {
        console.error("[moderation] Failed to log moderation event", error);
      }
      sendEvent("error", {
        error: responseFilter.reason || "The generated content was flagged. Please try a different question.",
      });
      recordLessonResult(false);
      return;
    }

    if (finished) return;

    const parsed = parseJSON(raw);
    if (parsed === null) {
      console.warn("[generate-lesson] parseJSON returned null", { requestId, rawPreview: raw?.slice?.(0, 500) });
      sendEvent("error", {
        error: "Failed to parse AI response. Please try again.",
      });
      recordLessonResult(false);
      return;
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
        rawPreview: raw?.slice?.(0, 1000),
      });
      sendEvent("error", {
        error: "AI response format was invalid. Please try again.",
      });
      recordLessonResult(false);
      return;
    }

    // Second safety layer on the AI reply: LLM moderation in addition to the
    // regex guard above. It ran concurrently with parsing/validation, so by
    // now it is usually already resolved. Fails open, so a moderation hiccup
    // won't block a valid lesson — only a confident "block" verdict stops it.
    // SPEED TACTIC: for fast mode, skip the await — the regex guard already
    // ran and the LLM moderation would add 4-8 s of pure latency. We still
    // kick off the call and log any post-hoc block for monitoring.
    if (mode === "fast") {
      outputModerationPromise.then((verdict) => {
        if (!verdict.allowed) {
          console.warn("[moderation] Fast-mode post-hoc block detected (response already sent)", {
            requestId,
            reason: verdict.reason,
          });
          logModerationEvent({
            timestamp: new Date().toISOString(),
            requestId,
            clerkId: req.auth?.userId || null,
            reason: verdict.reason,
            type: "ai-response-moderated-posthoc",
          }).catch(() => {});
        }
      }).catch(() => {});
    } else {
      const outputModeration = await outputModerationPromise;
      if (finished) return;
      if (!outputModeration.allowed) {
        const moderationEvent = {
          timestamp: new Date().toISOString(),
          requestId,
          clerkId: req.auth?.userId || null,
          reason: outputModeration.reason,
          type: "ai-response-moderated",
        };
        console.warn("[moderation] AI response blocked by LLM moderation", moderationEvent);
        await logModerationEvent(moderationEvent);
        sendEvent("error", {
          error:
            outputModeration.reason ||
            "The generated content was flagged by our safety review. Please try a different question.",
        });
        recordLessonResult(false);
        return;
      }
    }

    // Store the fully moderated + validated lesson so repeat requests are
    // instant (fire-and-forget; failures are non-fatal).
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
        : error instanceof GemmaApiError && error.status >= 500 && error.status < 600
        ? "Gemma service is temporarily unavailable. Please try again in a moment."
        : error instanceof GemmaApiError
        ? error.message
        : // Security: don't echo arbitrary internal error messages (driver/
          // infra errors can contain hostnames or config details) to clients.
          "Failed to generate lesson. Please try again.";

    console.error("[generate-lesson] Request failed", { requestId, error });
    recordLessonResult(false);
    sendEvent("error", { error: message });
  } finally {
    finishRequest("finally cleanup");
  }
});

try {
  validateStartupConfig();
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
} catch (error) {
  console.error("[startup] Backend configuration error:", error);
  process.exit(1);
}
