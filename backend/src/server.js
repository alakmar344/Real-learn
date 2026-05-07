import cors from "cors";
import express from "express";
import {
  callGemma,
  formatGemmaTimeoutMessage,
  GemmaTimeoutError,
  parseJSON,
} from "./lib/gemma.js";
import { GENERATE_LESSON_PROMPT } from "./lib/prompts.js";
import { isValidJourney } from "./validation.js";

const LESSON_TIMEOUT_MS = 60000;
const HEARTBEAT_INTERVAL_MS = 15000;

const app = express();
const port = Number(process.env.PORT || 10000);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",").map((origin) => origin.trim()) || "*",
    methods: ["POST", "OPTIONS"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

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
    const userPrompt = `Question: ${question}\nLanguage: ${language}\nLevel: ${level}`;

    let raw;
    try {
      raw = await callGemma(
        GENERATE_LESSON_PROMPT,
        userPrompt,
        true,
        0.6,
        LESSON_TIMEOUT_MS
      );
    } catch (error) {
      if (!(error instanceof GemmaTimeoutError)) {
        throw error;
      }

      raw = await callGemma(
        GENERATE_LESSON_PROMPT,
        userPrompt,
        false,
        0.6,
        LESSON_TIMEOUT_MS
      );
    }

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
    const message =
      error instanceof GemmaTimeoutError
        ? `${formatGemmaTimeoutMessage(LESSON_TIMEOUT_MS)} on both generate-lesson attempts (initial call with search, retry without search)`
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
