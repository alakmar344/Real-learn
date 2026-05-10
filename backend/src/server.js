import cors from "cors";
import express from "express";
import {
  callGemma,
  formatGemmaTimeoutMessage,
  GemmaTimeoutError,
  parseJSON,
} from "./lib/gemma.js";
import { GENERATE_LESSON_PROMPT } from "./lib/prompts.js";
import { fetchRealWorldContext } from "./lib/serper.js";
import { isValidJourney } from "./validation.js";

const DEFAULT_LESSON_TIMEOUT_MS = 300000;
const configuredLessonTimeoutMs = Number(process.env.LESSON_TIMEOUT_MS);
const LESSON_TIMEOUT_MS =
  Number.isFinite(configuredLessonTimeoutMs) && configuredLessonTimeoutMs > 0
    ? configuredLessonTimeoutMs
    : DEFAULT_LESSON_TIMEOUT_MS;
const HEARTBEAT_INTERVAL_MS = 15000;

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
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
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

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, HEARTBEAT_INTERVAL_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
  });

  const sendEvent = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const newsContext = await fetchRealWorldContext(question, language);

    const userPrompt = `Question: ${question}
Language: ${language}
Level: ${level}${
      newsContext
        ? `\n\nREAL WORLD CONTEXT FOR PART 3 (use this — do not search):\n${newsContext}`
        : ""
    }`;

    const raw = await callGemma(
      GENERATE_LESSON_PROMPT,
      userPrompt,
      false,
      0.6,
      LESSON_TIMEOUT_MS
    );

    const parsed = parseJSON(raw);
    if (!isValidJourney(parsed)) {
      sendEvent("error", { error: "Model returned invalid lesson format" });
      clearInterval(heartbeat);
      return res.end();
    }

    sendEvent("lesson", parsed);
    sendEvent("done", { ok: true });
    clearInterval(heartbeat);
    return res.end();
  } catch (error) {
    const timeoutMessage = formatGemmaTimeoutMessage(LESSON_TIMEOUT_MS);
    const message =
      error instanceof GemmaTimeoutError
        ? timeoutMessage
        : error instanceof Error
        ? error.message
        : "Failed to generate lesson";

    console.error("[generate-lesson]", error);
    sendEvent("error", { error: message });
    clearInterval(heartbeat);
    return res.end();
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
