import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { classifyTextFor13Plus } from "./safetyClassifier.js";

const DEFAULT_MODERATION_TIMEOUT_MS = 8000;
const configuredTimeoutMs = Number(process.env.MODERATION_TIMEOUT_MS);
const MODERATION_TIMEOUT_MS =
  Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_MODERATION_TIMEOUT_MS;
const MAX_MODERATION_INPUT_CHARS = 12000;
// Security: generated lessons (max_tokens 6000) can exceed 12k characters,
// and content in the tail must still be scanned — a lower cap left everything
// past 12k unmoderated. 60k is still ~2x the largest possible lesson
// (6000 tokens ≈ 24-30k chars). The classifier itself keeps its bounded
// sentence-window checks in safetyClassifier.js, while server.js still caps
// student questions at 1000 chars before generation.
const MAX_MODERATION_OUTPUT_CHARS = 60000;

const DEFAULT_MODERATION_CACHE_TTL_MS = 15 * 60 * 1000;
const configuredCacheTtlMs = Number(process.env.MODERATION_CACHE_TTL_MS);
const MODERATION_CACHE_TTL_MS =
  Number.isFinite(configuredCacheTtlMs) && configuredCacheTtlMs > 0
    ? configuredCacheTtlMs
    : DEFAULT_MODERATION_CACHE_TTL_MS;
const MODERATION_CACHE_MAX_ENTRIES = 500;
// `lru-cache` provides recency-eviction + capacity cap; the per-entry TTL is
// set per write so every verdict expires on its own clock.
const verdictCache = new LRUCache({ max: MODERATION_CACHE_MAX_ENTRIES });

function verdictCacheKey(kind, snippet) {
  return crypto.createHash("sha256").update(`${kind}|${snippet}`).digest("hex");
}

function verdictCacheGet(key) {
  return verdictCache.get(key);
}

function verdictCacheSet(key, verdict) {
  verdictCache.set(key, verdict, { ttl: MODERATION_CACHE_TTL_MS });
}

function isModerationEnabled() {
  const raw = (process.env.MODERATION_ENABLED || "true").trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(raw);
}

function getBlockReason(kind) {
  return kind === "output"
    ? "The generated content was flagged for review. Please try a different question or rephrase your request."
    : "Your question appears to contain content that violates our community guidelines. Please rephrase your request.";
}

export async function moderateText(text, kind = "input") {
  if (!isModerationEnabled()) return { allowed: true };
  if (!text || typeof text !== "string" || !text.trim()) return { allowed: true };

  const maxChars =
    kind === "output" ? MAX_MODERATION_OUTPUT_CHARS : MAX_MODERATION_INPUT_CHARS;
  const snippet = text.length > maxChars ? text.slice(0, maxChars) : text;
  const label = kind === "output" ? "AI-generated lesson" : "student question";

  const cacheKey = verdictCacheKey(kind, snippet);
  const cachedVerdict = verdictCacheGet(cacheKey);
  if (cachedVerdict) {
    console.log("[moderation] Verdict cache hit; skipping rule-based check", {
      kind,
      allowed: cachedVerdict.allowed,
    });
    return cachedVerdict;
  }

  const startedAt = Date.now();
  try {
    let blocked = false;
    let reason = "";

    const classification = classifyTextFor13Plus(snippet, kind === "output" ? "output" : "input");
    blocked = !classification.allowed;
    reason = getBlockReason(kind);

    if (blocked) {
      console.warn("[moderation] Content blocked by rule-based classifier", {
        kind,
        latencyMs: Date.now() - startedAt,
        reason,
        source: classification.source,
        category: classification.category,
      });
      const blockedResult = {
        allowed: false,
        reason,
      };
      verdictCacheSet(cacheKey, blockedResult);
      return blockedResult;
    }

    const allowedResult = { allowed: true };
    verdictCacheSet(cacheKey, allowedResult);
    return allowedResult;
  } catch (error) {
    // Security: fail CLOSED for AI OUTPUT. If the safety check itself breaks,
    // unreviewed model output must not reach a minors-facing product — the
    // user can simply retry. INPUT checks still fail open: blocking every
    // student question because of an internal error would take the whole
    // service down, and the output-side check remains as the backstop.
    if (kind === "output") {
      console.error("[moderation] Rule-based output check error; failing closed", {
        kind,
        error: error?.message,
      });
      return {
        allowed: false,
        reason: "Safety review could not be completed. Please try again.",
      };
    }
    console.warn("[moderation] Rule-based input check error; failing open", {
      kind,
      error: error?.message,
    });
    return { allowed: true };
  }
}
