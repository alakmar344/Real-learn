// Text-to-speech: Edge TTS synthesis behind an in-memory byte-budgeted cache
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LRUCache } from "lru-cache";
import { requireAuth } from "../lib/auth.js";
import { createRateLimiter } from "../lib/rateLimit.js";

let EdgeTTS = null;
try {
  const mod = await import("node-edge-tts");
  EdgeTTS = mod.EdgeTTS || null;
} catch (error) {
  console.error("[tts] Failed to load node-edge-tts via ESM import", error);
}

const TTS_TEMP_DIR = path.join(os.tmpdir(), "reallearn-tts");
if (!fs.existsSync(TTS_TEMP_DIR)) {
  fs.mkdirSync(TTS_TEMP_DIR, { recursive: true });
}
// Clean up orphaned temp files from previous crashes (fire-and-forget).
fs.promises.readdir(TTS_TEMP_DIR).then((files) => {
  for (const file of files) {
    fs.unlink(path.join(TTS_TEMP_DIR, file), () => {});
  }
}).catch(() => {});

const TTS_RATE_LIMIT_WINDOW_MS = 60000;
const TTS_RATE_LIMIT_MAX = 30;
const MAX_CONCURRENT_TTS_SYNTHESES = 8;
let activeTtsSyntheses = 0;

const ttsRateLimiter = createRateLimiter({
  windowMs: TTS_RATE_LIMIT_WINDOW_MS,
  max: TTS_RATE_LIMIT_MAX,
});

const TTS_CACHE_MAX_BYTES = 16 * 1024 * 1024; // 16 MB in-memory LRU
const TTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const ttsCache = new LRUCache({
  maxSize: TTS_CACHE_MAX_BYTES,
  sizeCalculation: (buffer) => buffer.length,
  ttl: TTS_CACHE_TTL_MS,
});
function ttsCacheGet(key) {
  return ttsCache.get(key) ?? null;
}
function ttsCacheSet(key, buffer) {
  if (buffer.length > TTS_CACHE_MAX_BYTES) return;
  ttsCache.set(key, buffer);
}

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
  "ml-IN": "ml-IN-SobhanaNeural",
  "pa-IN": "pa-IN-GurpreetNeural",
  "ur-IN": "ur-IN-SalmanNeural",
  "or-IN": "or-IN-LisaNeural",
  "en-US": "en-US-AriaNeural",
};

export async function ttsHandler(req, res) {
  const send = (status, payload) => {
    if (res.code && typeof res.code === "function") {
      return res.code(status).send(payload);
    }
    if (res.status && typeof res.status === "function") {
      return res.status(status).json(payload);
    }
  };

  try {
    if (!EdgeTTS) {
      return send(500, { error: "TTS service is not available." });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return send(400, { error: "text is required" });
    }
    if (text.length > 2000) {
      return send(400, { error: "Text is too long (max 2000 characters)." });
    }

    const requestedLang = typeof req.body?.lang === "string" ? req.body.lang.trim() : "";
    const lang = Object.prototype.hasOwnProperty.call(SPEECH_LANG_TO_VOICE, requestedLang)
      ? requestedLang
      : "en-IN";
    const voice = SPEECH_LANG_TO_VOICE[lang] || "en-IN-NeerjaNeural";

    const rate = sanitizeTtsProsody(req.body?.rate, TTS_RATE_VOLUME_PATTERN);
    const pitch = sanitizeTtsProsody(req.body?.pitch, TTS_PITCH_PATTERN);
    const volume = sanitizeTtsProsody(req.body?.volume, TTS_RATE_VOLUME_PATTERN);
    if (rate === null || pitch === null || volume === null) {
      return send(400, { error: "Invalid rate/pitch/volume format." });
    }
    const outputFormat = "audio-24khz-48kbitrate-mono-mp3";

    const cacheKey = crypto
      .createHash("sha256")
      .update(`${text}|${voice}|${lang}|${rate ?? ""}|${pitch ?? ""}|${volume ?? ""}|${outputFormat}`)
      .digest("hex");
    const etag = `"tts-${cacheKey.slice(0, 32)}"`;

    const reqHeaders = req.headers || {};
    if (reqHeaders["if-none-match"] === etag) {
      if (res.header && typeof res.header === "function") {
        res.header("ETag", etag);
        res.header("Cache-Control", "private, max-age=86400");
        return res.code(304).send();
      }
      if (res.setHeader && typeof res.setHeader === "function") {
        res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", "private, max-age=86400");
      }
      if (res.status && typeof res.status === "function") {
        return res.status(304).end();
      }
    }

    const sendAudio = (buffer) => {
      if (res.header && typeof res.header === "function") {
        res.header("Content-Type", "audio/mpeg");
        res.header("Content-Length", buffer.length);
        res.header("Content-Disposition", 'inline; filename="speech.mp3"');
        res.header("Cache-Control", "private, max-age=86400");
        res.header("ETag", etag);
        return res.code(200).send(buffer);
      }
      if (res.setHeader && typeof res.setHeader === "function") {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Content-Disposition", 'inline; filename="speech.mp3"');
        res.setHeader("Cache-Control", "private, max-age=86400");
        res.setHeader("ETag", etag);
      }
      if (res.send && typeof res.send === "function") {
        return res.send(buffer);
      }
    };

    const cached = ttsCacheGet(cacheKey);
    if (cached) {
      return sendAudio(cached);
    }

    if (activeTtsSyntheses >= MAX_CONCURRENT_TTS_SYNTHESES) {
      if (res.header && typeof res.header === "function") {
        res.header("Retry-After", 2);
      } else if (res.setHeader && typeof res.setHeader === "function") {
        res.setHeader("Retry-After", 2);
      }
      return send(503, { error: "Speech service is busy. Please retry in a moment." });
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

    const outFile = path.join(
      TTS_TEMP_DIR,
      `${cacheKey.slice(0, 16)}-${crypto.randomUUID()}.mp3`
    );
    let fileBuffer;
    activeTtsSyntheses += 1;
    try {
      await tts.ttsPromise(text, outFile);
      fileBuffer = await fs.promises.readFile(outFile);
    } finally {
      activeTtsSyntheses -= 1;
      fs.unlink(outFile, () => {});
    }

    ttsCacheSet(cacheKey, fileBuffer);
    return sendAudio(fileBuffer);
  } catch (error) {
    console.error("[api/tts] Failed to synthesize speech", error);
    return send(500, { error: "Failed to synthesize speech." });
  }
}

export default async function ttsRoutes(fastify) {
  fastify.post("/api/tts", { preHandler: [ttsRateLimiter, requireAuth] }, ttsHandler);
}
