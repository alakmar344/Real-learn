import crypto from "node:crypto";
import { callGemma, parseJSON } from "./gemma.js";

// NOTE: moderation runs through the same model configured by GEMMA_MODEL
// (callGemma has no per-call model override). A separate MODERATION_MODEL
// env var used to be read here but was silently ignored — removed to avoid
// misleading configuration.
const DEFAULT_MODERATION_TIMEOUT_MS = 8000;
const configuredTimeoutMs = Number(process.env.MODERATION_TIMEOUT_MS);
const MODERATION_TIMEOUT_MS =
  Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_MODERATION_TIMEOUT_MS;
const MAX_MODERATION_INPUT_CHARS = 12000;

const DEFAULT_MODERATION_CACHE_TTL_MS = 15 * 60 * 1000;
const configuredCacheTtlMs = Number(process.env.MODERATION_CACHE_TTL_MS);
const MODERATION_CACHE_TTL_MS =
  Number.isFinite(configuredCacheTtlMs) && configuredCacheTtlMs > 0
    ? configuredCacheTtlMs
    : DEFAULT_MODERATION_CACHE_TTL_MS;
const MODERATION_CACHE_MAX_ENTRIES = 500;
const verdictCache = new Map();

function verdictCacheKey(kind, snippet) {
  return crypto.createHash("sha256").update(`${kind}|${snippet}`).digest("hex");
}

function verdictCacheGet(key) {
  const entry = verdictCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    verdictCache.delete(key);
    return null;
  }
  return entry.verdict;
}

function verdictCacheSet(key, verdict) {
  if (verdictCache.has(key)) verdictCache.delete(key);
  verdictCache.set(key, { verdict, expiresAt: Date.now() + MODERATION_CACHE_TTL_MS });
  while (verdictCache.size > MODERATION_CACHE_MAX_ENTRIES) {
    const oldestKey = verdictCache.keys().next().value;
    verdictCache.delete(oldestKey);
  }
}

function isModerationEnabled() {
  const raw = (process.env.MODERATION_ENABLED || "true").trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(raw);
}

const MODERATION_SYSTEM_PROMPT = `You are a careful, fair content-safety classifier for RealLearn, an educational platform for students aged 13 and older.

Decide whether the provided TEXT must be BLOCKED. Block ONLY when the text genuinely contains or requests one of these:
- Sexual content involving minors, or sexually explicit / pornographic material.
- Actionable instructions to make weapons, explosives, or illegal drugs.
- Instructions or encouragement for violence against real people, self-harm, or suicide.
- Hate speech or harassment that attacks people based on a protected characteristic.
- Step-by-step help committing serious crimes (e.g. hacking, fraud, human trafficking).

DO NOT block legitimate educational, historical, scientific, literary, or factual content, even when the subject is sensitive. The following MUST always be ALLOWED:
- History and current affairs, including war, World War 1 and World War 2, the atomic bombings, genocide and the Holocaust, terrorism as a topic of study, and political conflict.
- Science and biology, including the human body, reproduction, diseases, chemistry, and physics (including how nuclear energy/weapons work conceptually).
- Discussion, definitions, causes, consequences, and analysis of difficult topics for learning purposes.

When you are unsure, ALLOW. Only block content that is clearly harmful and not educational in nature.

Respond with ONLY a compact JSON object and nothing else:
{"block": false}
or
{"block": true, "reason": "<short, friendly, user-facing reason>"}`;

export async function moderateText(text, kind = "input") {
  if (!isModerationEnabled()) return { allowed: true };
  if (!text || typeof text !== "string" || !text.trim()) return { allowed: true };

  const snippet =
    text.length > MAX_MODERATION_INPUT_CHARS
      ? text.slice(0, MAX_MODERATION_INPUT_CHARS)
      : text;
  const label = kind === "output" ? "AI-generated lesson" : "student question";

  const cacheKey = verdictCacheKey(kind, snippet);
  const cachedVerdict = verdictCacheGet(cacheKey);
  if (cachedVerdict) {
    console.log("[moderation] Verdict cache hit; skipping LLM call", {
      kind,
      allowed: cachedVerdict.allowed,
    });
    return cachedVerdict;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const raw = await callGemma(
      MODERATION_SYSTEM_PROMPT,
      `Classify this ${label}:\n\n${snippet}`,
      false,
      0,
      MODERATION_TIMEOUT_MS,
      controller.signal,
      80,
      false
    );
    const verdict = parseJSON(raw);

    if (!verdict || typeof verdict !== "object" || typeof verdict.block !== "boolean") {
      console.warn("[moderation] Unparseable verdict; failing open", {
        kind,
        latencyMs: Date.now() - startedAt,
        preview: raw.slice(0, 120),
      });
      return { allowed: true };
    }

    if (verdict.block === true) {
      console.warn("[moderation] Content blocked by classifier", {
        kind,
        latencyMs: Date.now() - startedAt,
        reason: verdict.reason,
      });
      const blockedResult = {
        allowed: false,
        reason:
          typeof verdict.reason === "string" && verdict.reason.trim()
            ? verdict.reason.trim()
            : "This content was flagged by our safety review. Please try a different question.",
      };
      verdictCacheSet(cacheKey, blockedResult);
      return blockedResult;
    }

    const allowedResult = { allowed: true };
    verdictCacheSet(cacheKey, allowedResult);
    return allowedResult;
  } catch (error) {
    if (error?.name === "AbortError") {
      console.warn("[moderation] Timed out; failing open", {
        kind,
        timeoutMs: MODERATION_TIMEOUT_MS,
      });
    } else {
      console.warn("[moderation] Error; failing open", {
        kind,
        error: error?.message,
      });
    }
    return { allowed: true };
  } finally {
    clearTimeout(timeoutId);
  }
}
