import cors from "cors";
import express from "express";
import {
  callGemma,
  formatGemmaTimeoutMessage,
  GemmaTimeoutError,
  GemmaApiError,
  GemmaCircuitOpenError,
  parseJSON,
} from "./lib/gemma.js";
import { GENERATE_LESSON_PROMPT } from "./lib/prompts.js";
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

const PRIVACY_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || "1.0";
const TERMS_OF_SERVICE_VERSION = process.env.TERMS_OF_SERVICE_VERSION || "1.0";
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
const rateLimitStore = new Map();
function getRateLimitKey(req) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const token = extractBearerToken(req);
  const identifier = token ? `user:${token.slice(0, 16)}` : `ip:${ip}`;
  return identifier;
}
function isRateLimited(req) {
  const key = getRateLimitKey(req);
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  record.count += 1;
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}
function resetRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}
setInterval(resetRateLimitStore, RATE_LIMIT_WINDOW_MS);

const DEFAULT_LESSON_TIMEOUT_MS = 300000;
const configuredLessonTimeoutMs = Number(process.env.LESSON_TIMEOUT_MS);
const LESSON_TIMEOUT_MS =
  Number.isFinite(configuredLessonTimeoutMs) && configuredLessonTimeoutMs > 0
    ? configuredLessonTimeoutMs
    : DEFAULT_LESSON_TIMEOUT_MS;
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
  const requiredVars = ["GEMMA_API_KEY"];
  const missing = requiredVars.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
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

function decrementActiveLessonRequests() {
  if (activeLessonRequests <= 0) {
    console.warn("[generate-lesson] Active request counter underflow prevented");
    activeLessonRequests = 0;
    return;
  }
  activeLessonRequests -= 1;
}

const app = express();
const port = Number(process.env.PORT || 10000);
const configuredOrigins =
  process.env.FRONTEND_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
const allowedOrigins =
  configuredOrigins.length > 0
    ? configuredOrigins
    : ["https://reallearn.esamz.site"];

// CORS and JSON body parsing MUST be registered before any route so that every
// endpoint (including /api/agreement) receives CORS headers and a parsed body.
app.use(
  cors({
    origin: (origin, callback) => {
      const isAllowed = !origin ||
                       origin === "null" ||
                       origin === "undefined" ||
                       allowedOrigins.includes(origin);
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
app.use(express.json({ limit: "1mb" }));

function securityHeaders(req, res, next) {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
  }
  next();
}

app.use(securityHeaders);

function rateLimit(req, res, next) {
  if (isRateLimited(req)) {
    console.warn("[rate-limit] Request blocked", {
      endpoint: req.path,
      key: getRateLimitKey(req),
    });
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Diagnostic endpoint: send the Clerk token as a Bearer header and it reports
// exactly why verification passes/fails (issuer, expiry, trust). No secrets
// leaked — only non-sensitive claim metadata.
app.get("/api/auth-debug", async (req, res) => {
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
    const { accepted, email, clerkId, deviceIp, timestamp } = req.body;

    if (typeof accepted !== "boolean") {
      return res.status(400).json({ error: "accepted (boolean) is required" });
    }
    if (!email || !clerkId) {
      return res.status(400).json({ error: "email and clerkId are required" });
    }

  const db = await getDb();
  const collection = db.collection("agreements");

  const filter = { clerkId, type: "cookie-consent" };
  const update = {
    $set: {
      accepted,
      email,
      clerkId,
      deviceIp: req.ip || req.connection?.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
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
    console.log("[api/agreement] Consent saved", { email, clerkId, accepted });

    res.json({ ok: true });
  } catch (error) {
    console.error("[api/agreement] Failed to save consent", error);
    res.status(500).json({ error: "Failed to save consent" });
  }
});

// Delete every server-side trace of the authenticated user: their MongoDB
// cookie-consent records AND their Clerk account. The frontend handles clearing
// localStorage and signing out after this resolves. Irreversible by design.
app.delete("/api/account", requireAuth, async (req, res) => {
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
  try {
    const db = await getDb();
    const filter = email ? { $or: [{ clerkId: userId }, { email }] } : { clerkId: userId };
    const result = await db.collection("agreements").deleteMany(filter);
    agreementsDeleted = result.deletedCount ?? 0;
    console.log("[api/account] Mongo agreements deleted", { userId, agreementsDeleted });
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
    return res.json({ ok: true, agreementsDeleted, clerkDeleted: true });
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
    if (!timestamp) {
      return res.status(400).json({ error: "timestamp is required" });
    }

    const db = await getDb();
    const collection = db.collection("agreements");
    const clerkId = req.auth?.userId;
    const email =
      bodyEmail ||
      req.auth?.email ||
      req.auth?.email_address ||
      "";

    const filter = { clerkId, type: "legal-consent" };
    const update = {
      $set: {
        accepted,
        email,
        clerkId,
        deviceIp: req.ip || req.connection?.remoteAddress || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
        timestamp: new Date(timestamp),
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

app.post("/api/generate-lesson", rateLimit, requireAuth, async (req, res) => {
  const requestId = `lesson-${Date.now()}-${++lessonRequestCounter}`;
  const question = req.body?.question?.trim();
  const language = req.body?.language ?? "English";
  const level = req.body?.level ?? "Class 9-10";
  console.log("[generate-lesson] Incoming request", {
    requestId,
    questionLength: question?.length ?? 0,
    language,
    level,
    activeLessonRequests,
  });

  if (!question) {
    console.warn("[generate-lesson] Missing question", { requestId });
    return res.status(400).json({ error: "Question is required" });
  }

  const inputFilter = filterUserInput(question);
  if (!inputFilter.allowed) {
    const moderationEvent = {
      timestamp: new Date().toISOString(),
      requestId,
      clerkId: req.auth?.userId || null,
      email: req.auth?.email || req.auth?.email_address || null,
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
  if (activeLessonRequests >= MAX_CONCURRENT_LESSON_REQUESTS) {
    console.warn("[generate-lesson] Busy: concurrency limit reached", {
      requestId,
      activeLessonRequests,
      maxConcurrent: MAX_CONCURRENT_LESSON_REQUESTS,
    });
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
    const pingPayload = Date.now();
    const pingWritten = safeWrite(`event: ping\ndata: ${pingPayload}\n\n`);
    console.log("[SSE] Ping emitted", { requestId, pingPayload, pingWritten });
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
    console.log("[SSE] Event emitted", {
      requestId,
      event,
      eventWritten,
      dataWritten,
    });
    return eventWritten && dataWritten;
  };

  try {
    let newsContext = null;
    try {
      console.log("[Serper] Context fetch start", { requestId });
      newsContext = await fetchRealWorldContext(question, language);
      console.log("[Serper] Context fetch end", {
        requestId,
        hasContext: Boolean(newsContext),
        contextLength: newsContext?.length ?? 0,
      });
    } catch (error) {
      console.warn("[Serper] Context fetch failed, continuing without context", {
        requestId,
        error,
      });
    }

    const userPrompt = `Question: ${question}
Language: ${language}
Level: ${level}${
      newsContext
        ? `\n\nREAL WORLD CONTEXT FOR PART 3 (use this — do not search):\n${newsContext}`
        : ""
    }`;

    console.log("[Gemma] callGemma start", {
      requestId,
      lessonTimeoutMs: LESSON_TIMEOUT_MS,
      userPromptLength: userPrompt.length,
      hasNewsContext: Boolean(newsContext),
    });
    const raw = await callGemma(
      GENERATE_LESSON_PROMPT,
      userPrompt,
      false,
      0.6,
      LESSON_TIMEOUT_MS
    );
    console.log("[Gemma] callGemma success", {
      requestId,
      rawLength: raw.length,
    });

    const responseFilter = filterAIResponse(raw);
    if (!responseFilter.allowed) {
      const moderationEvent = {
        timestamp: new Date().toISOString(),
        requestId,
        clerkId: req.auth?.userId || null,
        email: req.auth?.email || req.auth?.email_address || null,
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
      console.warn("[generate-lesson] parseJSON returned null", { requestId });
      sendEvent("error", {
        error: "Failed to parse AI response. Please try again.",
      });
      recordLessonResult(false);
      return;
    }
    const normalized = normalizeJourney(parsed);
    if (!isValidJourney(normalized)) {
      console.warn("[generate-lesson] normalizeJourney/isValidJourney failed", {
        requestId,
      });
      sendEvent("error", {
        error: "AI response format was invalid. Please try again.",
      });
      recordLessonResult(false);
      return;
    }

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
        : error instanceof Error
        ? error.message
        : "Failed to generate lesson";

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
