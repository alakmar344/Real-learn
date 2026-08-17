// Text-to-speech: Edge TTS synthesis behind an in-memory byte-budgeted cache
// (the cache and the concurrency counter are module-level singletons — this
// module is imported exactly once).
import crypto from "node:crypto";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LRUCache } from "lru-cache";
import { requireAuth } from "../lib/auth.js";
import { createRateLimiter } from "../lib/rateLimit.js";

const router = express.Router();

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
// SECURITY: each synthesis holds a WebSocket to the Edge TTS service, a temp
// file on disk, and the full MP3 in memory — per-caller rate limits alone
// don't bound the AGGREGATE across many callers. Cap simultaneous synthesis
// jobs so a burst degrades to fast 503s instead of exhausting sockets/disk;
// cache hits and 304 revalidations are unaffected.
const MAX_CONCURRENT_TTS_SYNTHESES = 8;
let activeTtsSyntheses = 0;

const ttsRateLimiter = createRateLimiter({
  windowMs: TTS_RATE_LIMIT_WINDOW_MS,
  max: TTS_RATE_LIMIT_MAX,
});

// ── TTS response cache ──
// BANDWIDTH: synthesized audio is by far the largest payload this server
// emits (~6 KB per second of speech). Cache generated MP3s by content hash so
// replays of the same text are served from memory, and expose an ETag so the
// browser can revalidate to a 9-byte 304 instead of re-downloading megabytes.
const TTS_CACHE_MAX_BYTES = 16 * 1024 * 1024; // 16 MB in-memory LRU
const TTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// `lru-cache` with `maxSize`/`sizeCalculation` enforces a byte budget and
// evicts least-recently-used entries automatically. Each entry carries its
// own 24h TTL.
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
  "ml-IN": "ml-IN-SobhanaNeural",
  "pa-IN": "pa-IN-GurpreetNeural",
  "ur-IN": "ur-IN-SalmanNeural",
  "or-IN": "or-IN-LisaNeural",
  "en-US": "en-US-AriaNeural",
};

// Security: TTS requires auth like every other data endpoint — it drives an
// external synthesis service (network/CPU/disk cost) and fills an in-memory
// cache, so it must not be an anonymous cost amplifier. Uses its own
// dedicated limiter (ttsRateLimiter) separate from the general API budget.
router.post("/api/tts", ttsRateLimiter, requireAuth, async (req, res) => {
  try {
    if (!EdgeTTS) {
      return res.status(500).json({ error: "TTS service is not available." });
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

    // Concurrency gate: only cache-missing requests reach actual synthesis.
    if (activeTtsSyntheses >= MAX_CONCURRENT_TTS_SYNTHESES) {
      res.setHeader("Retry-After", 2);
      return res
        .status(503)
        .json({ error: "Speech service is busy. Please retry in a moment." });
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
    activeTtsSyntheses += 1;
    try {
      await tts.ttsPromise(text, outFile);
      fileBuffer = await fs.promises.readFile(outFile);
    } finally {
      // Always release the synthesis slot and remove the temp file, even when
      // synthesis/read fails.
      activeTtsSyntheses -= 1;
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

export default router;
