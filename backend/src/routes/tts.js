import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { requireAuth } from "../lib/auth.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import { WebSocket } from "ws";

const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WINDOWS_FILE_TIME_EPOCH = 11644473600n;

function generateSecMsGecToken() {
  const ticks =
    BigInt(Math.floor(Date.now() / 1000 + Number(WINDOWS_FILE_TIME_EPOCH))) *
    10000000n;
  const roundedTicks = ticks - (ticks % 3000000000n);
  const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`;
  const hash = crypto.createHash("sha256");
  hash.update(strToHash, "ascii");
  return hash.digest("hex").toUpperCase();
}

function escapeXml(unsafe) {
  return (unsafe || "").replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}

function synthesizeEdgeTtsInMemory({
  text,
  voice,
  lang,
  outputFormat = "audio-24khz-48kbitrate-mono-mp3",
  rate = "default",
  pitch = "default",
  volume = "default",
  timeoutMs = 30000,
}) {
  return new Promise((resolve, reject) => {
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${generateSecMsGecToken()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`;
    const ws = new WebSocket(url, {
      host: "speech.platform.bing.com",
      origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_FULL_VERSION.split(".")[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM_FULL_VERSION.split(".")[0]}.0.0.0`,
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const chunks = [];
    let isDone = false;
    const timeout = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        try {
          ws.terminate();
        } catch {
          // ignore
        }
        reject(new Error("Edge TTS timed out"));
      }
    }, timeoutMs);

    ws.on("open", () => {
      ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n
      {
        "context": {
          "synthesis": {
            "audio": {
              "metadataoptions": {
                "sentenceBoundaryEnabled": "false",
                "wordBoundaryEnabled": "false"
              },
              "outputFormat": "${outputFormat}"
            }
          }
        }
      }`);

      const requestId = crypto.randomBytes(16).toString("hex");
      ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">
        <voice name="${voice}">
          <prosody rate="${rate || "default"}" pitch="${pitch || "default"}" volume="${volume || "default"}">
            ${escapeXml(text)}
          </prosody>
        </voice>
      </speak>`);
    });

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        const separator = "Path:audio\r\n";
        const separatorIndex = data.indexOf(separator);
        if (separatorIndex !== -1) {
          const audioData = data.subarray(separatorIndex + separator.length);
          if (audioData.length > 0) {
            chunks.push(audioData);
          }
        }
      } else {
        const message = data.toString();
        if (message.includes("Path:turn.end")) {
          if (!isDone) {
            isDone = true;
            clearTimeout(timeout);
            try {
              ws.close();
            } catch {
              // ignore
            }
            resolve(Buffer.concat(chunks));
          }
        }
      }
    });

    ws.on("error", (err) => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timeout);
        try {
          ws.terminate();
        } catch {
          // ignore
        }
        reject(err);
      }
    });

    ws.on("close", () => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timeout);
        if (chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error("Edge TTS connection closed before audio complete"));
        }
      }
    });
  });
}

const TTS_RATE_LIMIT_WINDOW_MS = 60000;
const TTS_RATE_LIMIT_MAX = 30;
const MAX_CONCURRENT_TTS_SYNTHESES = 8;
let activeTtsSyntheses = 0;
// Single-flight synthesis dedup: N concurrent cache-misses for the same
// (text, voice, prosody) share ONE Edge-TTS synthesis instead of burning N of
// the 8 concurrency slots producing byte-identical MP3s. Entries are removed
// as soon as the synthesis settles.
const inFlightSyntheses = new Map(); // cacheKey -> Promise<Buffer>

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

    // Join an identical in-flight synthesis instead of starting a duplicate.
    const inFlight = inFlightSyntheses.get(cacheKey);
    if (inFlight) {
      const sharedBuffer = await inFlight;
      return sendAudio(sharedBuffer);
    }

    if (activeTtsSyntheses >= MAX_CONCURRENT_TTS_SYNTHESES) {
      if (res.header && typeof res.header === "function") {
        res.header("Retry-After", 2);
      } else if (res.setHeader && typeof res.setHeader === "function") {
        res.setHeader("Retry-After", 2);
      }
      return send(503, { error: "Speech service is busy. Please retry in a moment." });
    }

    const synthesize = async () => {
      activeTtsSyntheses += 1;
      let buffer;
      try {
        buffer = await synthesizeEdgeTtsInMemory({
          text,
          voice,
          lang,
          outputFormat,
          rate,
          pitch,
          volume,
          timeoutMs: 30000,
        });
      } finally {
        activeTtsSyntheses -= 1;
      }
      ttsCacheSet(cacheKey, buffer);
      return buffer;
    };

    const synthesisPromise = synthesize();
    // Joiners handle rejections themselves; swallow here so a failure with no
    // joiner never surfaces as an unhandledRejection.
    synthesisPromise.catch(() => {});
    inFlightSyntheses.set(cacheKey, synthesisPromise);
    let resultBuffer;
    try {
      resultBuffer = await synthesisPromise;
    } finally {
      inFlightSyntheses.delete(cacheKey);
    }
    return sendAudio(resultBuffer);
  } catch (error) {
    console.error("[api/tts] Failed to synthesize speech", error);
    return send(500, { error: "Failed to synthesize speech." });
  }
}

export default async function ttsRoutes(fastify) {
  fastify.post("/api/tts", { preHandler: [ttsRateLimiter, requireAuth] }, ttsHandler);
}
