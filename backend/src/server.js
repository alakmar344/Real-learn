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

const DEFAULT_LESSON_TIMEOUT_MS = 300000;
const configuredLessonTimeoutMs = Number(process.env.LESSON_TIMEOUT_MS);
const LESSON_TIMEOUT_MS =
  Number.isFinite(configuredLessonTimeoutMs) && configuredLessonTimeoutMs > 0
    ? configuredLessonTimeoutMs
    : DEFAULT_LESSON_TIMEOUT_MS;
const HEARTBEAT_INTERVAL_MS = 15000;
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
    : ["https://reallearn-taupe.vercel.app"];

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

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
    methods: ["POST", "OPTIONS", "GET"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.post("/api/generate-lesson", async (req, res) => {
  const question = req.body?.question?.trim();
  const language = req.body?.language ?? "English";
  const level = req.body?.level ?? "Class 9-10";

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }
  if (activeLessonRequests >= MAX_CONCURRENT_LESSON_REQUESTS) {
    console.warn("[generate-lesson] Rejected due to concurrency limit", { activeLessonRequests });
    return res
      .status(503)
      .json({ error: "Server is busy. Please retry in a few seconds." });
  }
  activeLessonRequests += 1;
  const requestId = Math.random().toString(36).substring(7);
  console.info(`[generate-lesson:${requestId}] Starting request`, { question, language, level, active: activeLessonRequests });

  const controller = new AbortController();

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send initial comment to keep stream alive through proxies
  res.write(": ok\n\n");

  let finished = false;
  const safeWrite = (chunk) => {
    try {
      if (res.writableEnded || res.finished) return false;
      return res.write(chunk);
    } catch (error) {
      console.error(`[SSE:${requestId}] write failed`, error);
      return false;
    }
  };
  const finishRequest = (reason = "finished") => {
    if (finished) return;
    console.info(`[generate-lesson:${requestId}] Request ending. Reason: ${reason}`);
    finished = true;
    controller.abort();
    clearInterval(heartbeat);
    decrementActiveLessonRequests();
    if (!res.writableEnded) {
        res.end();
    }
  };
  const heartbeat = setInterval(() => {
    if (finished) return;
    // failures in heartbeat are non-fatal to maintain stream connectivity
    safeWrite(`event: ping\ndata: ${Date.now()}\n\n`);
  }, HEARTBEAT_INTERVAL_MS);

  req.on("close", () => finishRequest("client_closed"));
  res.on("error", (error) => {
    console.error(`[SSE:${requestId}] response error`, error);
    finishRequest("response_error");
  });

  const sendEvent = (event, payload) => {
    const eventWritten = safeWrite(`event: ${event}\n`);
    const dataWritten = safeWrite(`data: ${JSON.stringify(payload)}\n\n`);
    return eventWritten && dataWritten;
  };

  try {
    let newsContext = null;
    try {
      newsContext = await fetchRealWorldContext(question, language);
    } catch (error) {
      console.warn(`[Serper:${requestId}] Context fetch failed, continuing without context`, error);
    }

    const userPrompt = `Question: ${question}
Language: ${language}
Level: ${level}${
      newsContext
        ? `\n\nREAL WORLD CONTEXT FOR PART 3 (use this — do not search):\n${newsContext}`
        : ""
    }`;

    console.info(`[generate-lesson:${requestId}] Calling Gemma API...`);
    const raw = await callGemma(
      GENERATE_LESSON_PROMPT,
      userPrompt,
      false,
      0.6,
      LESSON_TIMEOUT_MS,
      controller.signal
    );

    if (finished) return;

    const parsed = parseJSON(raw);
    if (parsed === null) {
      console.error(`[generate-lesson:${requestId}] JSON parse failed`);
      sendEvent("error", {
        error: "Failed to parse AI response. Please try again.",
      });
      recordLessonResult(false);
      return;
    }
    const normalized = normalizeJourney(parsed);
    if (!isValidJourney(normalized)) {
      console.error(`[generate-lesson:${requestId}] Journey validation failed`);
      sendEvent("error", {
        error: "AI response format was invalid. Please try again.",
      });
      recordLessonResult(false);
      return;
    }

    console.info(`[generate-lesson:${requestId}] Success! Sending lesson.`);
    sendEvent("lesson", normalized);
    sendEvent("done", { ok: true });
    recordLessonResult(true);
  } catch (error) {
    if (finished) return;
    if (error.name === 'AbortError') {
      console.log(`[generate-lesson:${requestId}] Request aborted`);
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

    console.error(`[generate-lesson:${requestId}] Error:`, error);
    recordLessonResult(false);
    sendEvent("error", { error: message });
  } finally {
    finishRequest("cleanup");
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
