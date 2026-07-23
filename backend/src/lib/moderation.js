import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { Filter } from "bad-words";
import { filterText, containsProfanity } from "better-profane-words";

const DEFAULT_MODERATION_TIMEOUT_MS = 8000;
const configuredTimeoutMs = Number(process.env.MODERATION_TIMEOUT_MS);
const MODERATION_TIMEOUT_MS =
  Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_MODERATION_TIMEOUT_MS;
const MAX_MODERATION_INPUT_CHARS = 12000;
const MAX_MODERATION_OUTPUT_CHARS = 60000;

const DEFAULT_MODERATION_CACHE_TTL_MS = 15 * 60 * 1000;
const configuredCacheTtlMs = Number(process.env.MODERATION_CACHE_TTL_MS);
const MODERATION_CACHE_TTL_MS =
  Number.isFinite(configuredCacheTtlMs) && configuredCacheTtlMs > 0
    ? configuredCacheTtlMs
    : DEFAULT_MODERATION_CACHE_TTL_MS;
const MODERATION_CACHE_MAX_ENTRIES = 500;
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

const profanityFilter = new Filter({ placeHolder: "*" });
profanityFilter.removeWords("god");
profanityFilter.addWords(
  "kidnap",
  "kidnapping",
  "kidnapper",
  "kidnapped",
  "abduct",
  "abduction",
  "abductor",
  "abducted",
  "abducting",
  "hostage",
  "hostages",
  "ransom",
  "ransoms",
  "captivity",
  "captive",
  "captives",
  "trafficking",
  "humantrafficking",
  "sextrafficking",
  "childtrafficking",
  "torture",
  "torturing",
  "tortured",
  "groom",
  "grooming",
  "groomed",
  "bomb",
  "bomber",
  "bombing",
  "explosive",
  "gun",
  "firearm",
  "kill",
  "murder",
  "murderer",
  "hack",
  "hacking",
  "hacker",
  "weapon",
  "knife",
  "stab",
  "poison",
  "poisoning",
  "terrorist",
  "terrorism",
  "shoot",
  "shooting",
  "abuse",
  "selfharm",
  "self-harm",
  "suicide",
  "rap",
  "raping",
  "rapist",
  "molest"
);

const TEEN_MIN_INTENSITY = 2;

function containsUnsafeContent(text) {
  if (!text || typeof text !== "string") return false;
  if (profanityFilter.isProfane(text)) return true;
  const result = filterText(text, { minIntensity: TEEN_MIN_INTENSITY });
  return result.matched.length > 0;
}

function sanitizeContent(text) {
  if (!text || typeof text !== "string") return text;
  let cleaned = profanityFilter.clean(text);
  cleaned = filterText(cleaned, { minIntensity: TEEN_MIN_INTENSITY }).clean;
  return cleaned;
}

function getUserInputBlockReason() {
  return "Your question appears to contain content that violates our community guidelines. Please rephrase your request.";
}

function getAIResponseBlockReason() {
  return "The generated content was flagged for review. Please try a different question or rephrase your request.";
}

export function sanitizeText(text) {
  return sanitizeContent(text);
}

export async function moderateText(text, kind = "input") {
  if (!isModerationEnabled()) return { allowed: true };
  if (!text || typeof text !== "string" || !text.trim()) return { allowed: true };

  const maxChars =
    kind === "output" ? MAX_MODERATION_OUTPUT_CHARS : MAX_MODERATION_INPUT_CHARS;
  const snippet = text.length > maxChars ? text.slice(0, maxChars) : text;

  const cacheKey = verdictCacheKey(kind, snippet);
  const cachedVerdict = verdictCacheGet(cacheKey);
  if (cachedVerdict) {
    console.log("[moderation] Verdict cache hit; skipping profanity check", {
      kind,
      allowed: cachedVerdict.allowed,
    });
    return cachedVerdict;
  }

  const startedAt = Date.now();
  try {
    const blocked = containsUnsafeContent(snippet);
    const reason = kind === "output" ? getAIResponseBlockReason() : getUserInputBlockReason();

    if (blocked) {
      console.warn("[moderation] Content blocked by profanity filter", {
        kind,
        latencyMs: Date.now() - startedAt,
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
    if (kind === "output") {
      console.error("[moderation] Output check error; failing closed", {
        kind,
        error: error?.message,
      });
      return {
        allowed: false,
        reason: "Safety review could not be completed. Please try again.",
      };
    }
    console.warn("[moderation] Input check error; failing open", {
      kind,
      error: error?.message,
    });
    return { allowed: true };
  }
}
