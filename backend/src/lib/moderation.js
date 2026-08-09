import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { Filter } from "bad-words";
import { filterText } from "better-profane-words";
import { containsHarmfulContent } from "./contentGuard.js";

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

// ── LAYER 1: Canonicalization & Character Normalization ──────────────────────
const INVISIBLE_CHARS_PATTERN = /[­͏؜᠎​-‏‪-‮⁠-⁤﻿]/g;

function canonicalizeText(rawText) {
  if (!rawText || typeof rawText !== "string") return "";
  return rawText
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── LAYER 2: Deterministic Syntactic Grammar & Intent Frame Parser ────────────
const INQUIRY_GRAMMAR_PATTERNS = [
  /^(?:what|how|why|when|where|who|explain|describe|tell\s+me\s+about|detail|history\s+of|background\s+of)\b/i,
  /(?:what|how|why|when|where|who)\s+(?:was|were|did|is|are|happened|occurred|took\s+place|developed|created|invented|discovered|unfolded|fought|worked|functioned)\b/i,
  /\b(?:in\s+world\s*war|during\s+ww[12]|in\s+history|the\s+manhattan\s+project|in\s+physics|in\s+chemistry|in\s+biology)\b/i,
];

const IMPERATIVE_ACTION_PATTERNS = [
  /^(?:how\s+(?:to|can\s+i|do\s+i)|directions?\s+to|steps?\s+to|recipe\s+for|blueprint\s+for|guide\s+to|tutorial\s+on)\s+(?:make|build|synthesize|cook|manufacture|construct|assemble|3d\s*print)\b/i,
];

function isEducationalInquiryFrame(text) {
  const isImperative = IMPERATIVE_ACTION_PATTERNS.some((pattern) => pattern.test(text));
  if (isImperative) return false;
  return INQUIRY_GRAMMAR_PATTERNS.some((pattern) => pattern.test(text));
}

// ── LAYER 3: Educational Whitelist & Fast-Path Engine ────────────────────────
const EDUCATIONAL_DOMAIN_PATTERNS = [
  // History & World Conflict Events:
  /\b(?:world\s*war\s*[12i|v]+|ww[12]|manhattan\s*project|atomic\s*bomb|nuclear\s*bomb|holocaust|cold\s*war|french\s*revolution|civil\s*war|inquisition|vietnam\s*war|gulf\s*war|pearl\s*harbor|hiroshima|nagasaki|oppenheimer)\b/i,
  // Physics & Chemistry:
  /\b(?:nuclear\s*fission|nuclear\s*fusion|radioactivity|chain\s*reaction|uranium|plutonium|thermodynamics|quantum|combustion)\b/i,
  // Biology & Health:
  /\b(?:cell\s*penetration|immune\s*system|white\s*blood\s*cells|pathogen|virus|bacteria|homo\s*sapiens|vaccogenic|vaccines?|herd\s*immunity)\b/i,
  // Social & Behavioral Science:
  /\b(?:history\s+of\s+terrorism|suicide\s+prevention|human\s+trafficking\s+prevention|rap\s+music)\b/i,
  // Sports & Game Theory:
  /\b(?:tit\s+for\s+tat|bowling\s+\d+\s+balls|dick\s+fosbury|cock\s+the\s+wrist|shoot\s+a\s+basketball|power\s+hitter)\b/i,
  // Business & Tech:
  /\b(?:market\s+penetration|ethical\s+hacking|radar\s+penetration)\b/i,
];

function isEducationalDomain(text) {
  return EDUCATIONAL_DOMAIN_PATTERNS.some((pattern) => pattern.test(text));
}

// ── Profanity Filter Setup ───────────────────────────────────────────────────
const EDUCATIONAL_EXCLUDED_WORDS = [
  "god",
  "balls",
  "homo",
  "screw",
  "butt",
  "tit",
  "dick",
  "cock",
  "penetrate",
  "penetration",
  "bomb",
  "war",
  "kill",
];

const profanityFilter = new Filter({ placeHolder: "*" });
profanityFilter.removeWords(...EDUCATIONAL_EXCLUDED_WORDS);

const EDUCATIONAL_EXCLUDED_SET = new Set(EDUCATIONAL_EXCLUDED_WORDS);
const TEEN_MIN_INTENSITY = 2;
const TOPIC_ONLY_CATEGORIES = new Set(["violence", "drug"]);

function isNonTopicMatch(match) {
  if (!match || !match.word) return true;
  if (EDUCATIONAL_EXCLUDED_SET.has(match.word.toLowerCase())) return false;
  const cats = match?.categories;
  if (!Array.isArray(cats) || cats.length === 0) return true;
  return cats.some((category) => !TOPIC_ONLY_CATEGORIES.has(category));
}

// ── LAYER 4: Harmful Intent & Profanity Verification ────────────────────────
// `kind` distinguishes user INPUT from AI OUTPUT. `canonical: true` skips a
// redundant canonicalize pass when the caller already canonicalized the text.
function containsUnsafeContent(text, { kind = "input", canonical = false } = {}) {
  if (!text || typeof text !== "string") return false;
  const canonicalized = canonical ? text : canonicalizeText(text);

  // LAYER 4A: Intent-based zero-tolerance harmful-content check (weapons recipes, CSAM, threats)
  if (containsHarmfulContent(canonicalized)) return true;

  const educationalFrame =
    isEducationalInquiryFrame(canonicalized) && isEducationalDomain(canonicalized);

  // LAYER 3 FAST-PATH: an educational inquiry frame bypasses the broad
  // profanity heuristic — but ONLY for user INPUT. AI OUTPUT is cached and
  // served to every future learner, so it must never skip the slur dictionary
  // (LAYER 4B below); a generated WWII/biology lesson matches the educational
  // frame yet could still emit an actual slur.
  if (kind === "input" && educationalFrame) {
    return false;
  }

  // LAYER 4B (broad, false-positive-prone): bad-words. Skipped for educational
  // output to avoid flagging legitimate sensitive-topic lessons.
  if (!educationalFrame && profanityFilter.isProfane(canonicalized)) return true;

  // LAYER 4B (targeted slurs): always runs on output. isNonTopicMatch already
  // excludes topic-only categories (violence/drug) and educational vocabulary,
  // so real slurs are caught without blocking on-topic educational language.
  const result = filterText(canonicalized, { minIntensity: TEEN_MIN_INTENSITY });
  return result.matched.some(isNonTopicMatch);
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

// ── Main Entry Point ────────────────────────────────────────────────────────
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
    const canonicalized = canonicalizeText(snippet);

    // LAYER 3 FAST-PATH EXECUTION
    if (kind === "input" && isEducationalInquiryFrame(canonicalized) && isEducationalDomain(canonicalized)) {
      if (!containsHarmfulContent(canonicalized)) {
        console.log("[moderation] Educational fast-path approved", {
          kind,
          latencyMs: Date.now() - startedAt,
        });
        const fastPathResult = { allowed: true, category: "educational_inquiry" };
        verdictCacheSet(cacheKey, fastPathResult);
        return fastPathResult;
      }
    }

    const blocked = containsUnsafeContent(canonicalized, { kind, canonical: true });
    const reason = kind === "output" ? getAIResponseBlockReason() : getUserInputBlockReason();

    if (blocked) {
      console.warn("[moderation] Content blocked by profanity/safety filter", {
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

