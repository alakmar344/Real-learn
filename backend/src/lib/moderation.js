import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { Filter } from "bad-words";

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
// (6000 tokens ≈ 24-30k chars) while bounding the regex work: several banned
// patterns contain multiple `[^.!?]*` runs, which degrade quadratically on
// punctuation-free text, so the cap is the effective ReDoS guard.
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

// Additional library-backed layer for profanity, slurs, and high-severity
// harmful keywords (especially kidnapping / abduction). Normalization runs
// before this check so leet-speak and invisible characters cannot trivially
// bypass it.
const profanityFilter = new Filter();
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
  "groomed"
);

const LEEK_MAP = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "9": "g",
  "1": "i",
  "!": "i",
  "0": "o",
  "5": "s",
  "$": "s",
  "7": "t",
  "+": "t",
};

function normalizeLeet(text) {
  return text
    .split("")
    .map((ch) => LEEK_MAP[ch] ?? ch)
    .join("");
}

function collapseWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

// SECURITY: strip invisible/zero-width characters BEFORE pattern matching.
// Without this, "b​omb" (zero-width space inside the word) defeats every
// word-boundary regex while rendering identically to the user. Also NFKC-fold
// so fullwidth/compatibility forms ("ｂｏｍｂ") collapse to plain ASCII.
const INVISIBLE_CHARS_PATTERN = /[­͏؜᠎​-‏‪-‮⁠-⁤﻿]/g;
function stripInvisible(text) {
  return text.normalize("NFKC").replace(INVISIBLE_CHARS_PATTERN, "");
}

function normalizeForModeration(text) {
  return collapseWhitespace(normalizeLeet(stripInvisible(text).toLowerCase()));
}

// IMPORTANT — why the gaps are `[^.!?]*` and not `.*`:
// Moderation normalizes text before matching, and normalization collapses ALL
// whitespace (including the newlines between sentences and lesson parts) into
// single spaces. A `.*` gap therefore spans the ENTIRE document, so a long,
// perfectly innocent lesson that merely happens to contain the trigger words in
// different sentences would match — e.g. a herd-immunity lesson saying
// "vaccines cannot ... give you ... this" was wrongly flagged as unsafe.
// `[^.!?]*` keeps each pattern scoped to a SINGLE sentence, which is the right
// granularity for detecting genuine harmful intent ("how to make a bomb") while
// never blocking an educational document just because words co-occur far apart.
// Content that is illegal / disallowed REGARDLESS of framing. These apply to
// both student questions AND generated lessons, because there is no legitimate
// educational reason to produce them.
const ALWAYS_ILLEGAL_PATTERNS = [
  // ── Child sexual abuse / exploitation — always blocked ──
  /\bchild\b[^.!?]*\b(sexual|sex|porn|pornography|molest|nude|naked)\b/i,
  /\b(child|minor|kid)\b[^.!?]*\b(csam|cp)\b/i,
  /\b(sexual|sexually)\b[^.!?]*\b(abuse|exploit|explicit)\b[^.!?]*\b(child|minor|kid)\b/i,
  /\b(child|minor|kid)\b[^.!?]*\b(sexual|sexually|porn|nude|naked)\b/i,
  /\bchild\b[^.!?]*\b(bride|marriage)\b/i,

  // ── Sexual violence ──
  /\brape\b|\bsexual\b[^.!?]*\b(assault|violence)\b/i,
  /\brevenge\s*porn\b|\bnon[\s-]*consensual\b[^.!?]*\b(sex|porn|image|photo)\b/i,
  /\b(bestiality|zoophilia)\b/i,
];

// Instructional-intent patterns — a *student asking how to do harm*. These
// apply to INPUT only. They must NOT be run against generated lessons: a
// history lesson legitimately says "how the atomic bomb was built" and a
// chemistry lesson explains reactions, and re-blocking those on output would
// make the sensitive-but-educational topics the app is designed to teach
// unanswerable. Harmful requests are already stopped at the input gate.
const INSTRUCTIONAL_PATTERNS = [
  // ── Weapons / explosives / drugs: block instructional intent, not mentions ──
  /\bhow\b[^.!?]*\b(make|build|construct|create|assemble|manufacture|3d\s*print)\b[^.!?]*\b(bomb|explosive|ied|grenade|pipe\s*bomb|molotov|landmine)\b/i,
  /\b(bomb|explosive|ied)\b[^.!?]*\b(making|building|recipe|instruction|tutorial|blueprint)\b/i,
  /\bhow\b[^.!?]*\b(make|build|3d\s*print|manufacture|obtain|get)\b[^.!?]*\b(gun|firearm|silencer|ghost\s*gun|untraceable\s*weapon)\b/i,
  /\bhow\b[^.!?]*\b(make|synthesize|cook|manufacture|produce|grow)\b[^.!?]*\b(meth|methamphetamine|cocaine|crack|heroin|fentanyl|mdma|ecstasy|lsd|illegal\s*drugs)\b/i,

  // ── Violence / kidnapping against a person (instructional intent) ──
  /\bhow\b[^.!?]*\b(kill|murder|poison|stab|strangle|assault|kidnap)\b[^.!?]*\b(someone|somebody|a\s*person|people|him|her|them|my|a\s*child|children)\b/i,
  /\bhow\b[^.!?]*\b(kidnap|abduct)\b[^.!?]*\b(someone|somebody|a\s*person|people|him|her|them|my|a\s*child|children|hostage|ransom)\b/i,
  /\b(kidnap|abduct|abduction|kidnapping)\b[^.!?]*\b(guide|tutorial|steps?|instructions?|recipe|tips?|plan|planning|carry\s*out|execute|hostage|ransom|captive)\b/i,
  /\bhow\b[^.!?]*\b(get\s*away\s*with|commit)\b[^.!?]*\b(murder|killing|crime|kidnapping|abduction)\b/i,
  /\b(plan|planning|carry\s*out|execute)\b[^.!?]*\b(terror|terrorist|mass|school)\b[^.!?]*\b(attack|shooting|bombing|kidnapping)\b/i,
  /\b(hold\s*someone|take\s*someone|keep\s*someone)\b[^.!?]*\b(hostage|captive|captivity|ransom)\b/i,

  // ── Self-harm / suicide encouragement or methods ──
  /\bhow\b[^.!?]*\b(commit\s*)?(suicide|kill\s*myself|end\s*my\s*life)\b/i,
  /\b(best|fastest|painless|easiest|most\s*effective)\b[^.!?]*\bway\b[^.!?]*\b(die|kill\s*myself|commit\s*suicide)\b/i,
  /\bhow\b[^.!?]*\b(cut|harm|hurt|injure)\b[^.!?]*\bmyself\b/i,
  /\bsuicide\b[^.!?]*\b(method|technique|pact)\b/i,

  // ── Hate content generation (intent to produce slurs/hate, not the topic) ──
  /\b(generate|write|give\s*me|create|tell\s*me\s*a)\b[^.!?]*\b(hate\s*speech|racist\s*(joke|slur)|ethnic\s*slur|slurs?)\b/i,

  // ── Cybercrime / fraud (instructional intent) ──
  /\bhow\b[^.!?]*\b(hack|breach|break\s*into)\b[^.!?]*\b(bank|account|wifi|wi-fi|password|email|phone|government|system|network|server)\b/i,
  /\bhow\b[^.!?]*\b(steal|launder|counterfeit)\b[^.!?]*\b(money|cash|cards?|identit|funds)\b/i,
  /\b(credit\s*card|identity)\b[^.!?]*\b(theft|fraud)\b[^.!?]*\b(how|guide|tutorial|step|tips)\b/i,

  // ── Trafficking / smuggling (instructional intent) ──
  /\bhow\b[^.!?]*\b(traffic|smuggle)\b[^.!?]*\b(people|humans|a\s*person|drugs|weapons)\b/i,

  // ── Paraphrased instructional intent (no "how") ──
  // "steps/instructions/recipe to make a bomb", "teach me to build an IED".
  // The indefinite article ("a bomb", "an explosive") is deliberate: it
  // distinguishes wanting to MAKE one from historical questions about "the
  // atomic bomb", which must remain answerable.
  /\b(steps?|instructions?|guide|tutorial|recipe|blueprint)\b[^.!?]*\b(to|for)\b[^.!?]*\b(make|making|build|building|create|creating|assemble|assembling)\b[^.!?]*\b(a|an|my\s+own)\s+(bomb|explosive|ied|grenade|pipe\s*bomb|molotov|landmine|gun|firearm|silencer)\b/i,
  /\b(teach|show|tell|help)\b[^.!?]*\bme\b[^.!?]*\b(make|build|create|assemble|synthesize|cook)\b[^.!?]*\b(a|an|my\s+own)\s+(bomb|explosive|ied|grenade|pipe\s*bomb|molotov|landmine|gun|firearm|silencer)\b/i,
  // Drug synthesis has no legitimate at-home framing at all.
  /\b(steps?|instructions?|guide|tutorial|recipe|formula|blueprint|teach\s+me|show\s+me)\b[^.!?]*\b(make|making|synthesize|synthesizing|cook|cooking|produce|producing|manufacture|manufacturing)\b[^.!?]*\b(meth|methamphetamine|cocaine|crack|heroin|fentanyl|mdma|ecstasy|lsd)\b/i,
  /\b(recipe|formula)\b[^.!?]*\b(for|of)\b[^.!?]*\b(meth|methamphetamine|cocaine|crack|heroin|fentanyl|mdma|ecstasy|lsd)\b/i,
  // Self-harm paraphrases: "ways to end my life", "methods to kill myself".
  /\b(ways?|methods?|ideas?|tips?)\b[^.!?]*\b(kill\s+myself|end\s+my\s+life|commit\s+suicide|hurt\s+myself|harm\s+myself)\b/i,

  // ── Multilingual coverage (the product serves 12 languages; the patterns
  // above are English-only, which previously let the same harmful requests
  // through verbatim in Hindi/Hinglish). Devanagari + romanized-Hindi forms of
  // the highest-severity intents. `।` (danda) is the Devanagari sentence
  // terminator and joins the sentence-scoping exclusion set. ──
  // Bomb-making (Devanagari): "बम कैसे बनाएं", "बम बनाने का तरीका"
  /बम[^.!?।]*(कैसे|बनान|बनाना|बनाने|बनाऊ|बनाए|तरीक)/,
  /(कैसे|तरीक)[^.!?।]*बम[^.!?।]*बना/,
  // Bomb-making (romanized): "bomb kaise banaye", "bam banane ka tarika"
  /\b(bomb|bam)\b[^.!?]*\b(kaise|banane|banana|banau|banaye|tarika|tareeka)\b/i,
  /\b(kaise|tarika|tareeka)\b[^.!?]*\b(bomb|bam)\b[^.!?]*\bbana/i,
  // Suicide (Devanagari): "आत्महत्या कैसे करें", "खुदकुशी का तरीका"
  /(आत्महत्या|खुदकुशी|ख़ुदकुशी)[^.!?।]*(कैसे|तरीक|करू|करें|करने)/,
  /(कैसे|तरीक)[^.!?।]*(आत्महत्या|खुदकुशी|ख़ुदकुशी)/,
  // Suicide (romanized): "khudkushi kaise kare", "atmahatya karne ka tarika"
  /\b(khudkushi|khudkhushi|atmahatya|aatmahatya)\b[^.!?]*\b(kaise|kare|karu|karne|tarika|tareeka)\b/i,
  /\b(kaise|tarika|tareeka)\b[^.!?]*\b(khudkushi|khudkhushi|atmahatya|aatmahatya)\b/i,
  // Killing someone (Devanagari): "किसी को कैसे मारें"
  /(किसी\s*को|उसे|उन्हें)[^.!?।]*(कैसे)[^.!?।]*(मार|जान\s*से)/,
  // Kidnapping / abduction (Devanagari): "अपहरण कैसे करें", "किडनैप का तरीका"
  /(अपहरण|किडनैप|किडनैपिंग)[^.!?।]*(कैसे|तरीक|करू|करें|करने|प्लान|योजना)/,
  /(कैसे|तरीक)[^.!?।]*(अपहरण|किडनैप|किडनैपिंग)[^.!?।]*(करें|करू|करने|करो)/,
  /(किसी\s*को|बच्चे\s*को|उसे|उन्हें)[^.!?।]*(किडनैप|अपहरण|उठा)[^.!?।]*(कैसे|करें|करो|ले\s*जा)/,
  // Kidnapping (romanized Hindi): "kidnap kaise kare", "apharan ka tarika"
  /\b(kidnap|apharan|apaharan|udha)\b[^.!?]*\b(kaise|banane|kare|karu|karne|tarika|tareeka|plan|tarike)\b/i,
  /\b(kaise|tarika|tareeka|plan|tarike)\b[^.!?]*\b(kidnap|apharan|apaharan|udha)\b[^.!?]*\b(kare|karu|karne|karo|banaye)\b/i,
  /\b(kisi\s*ko|bachhe\s*ko|use|unhe)\b[^.!?]*\b(kidnap|apharan|apaharan|udha)\b[^.!?]*\b(kaise|kare|karu|le\s*ja)\b/i,
];

// Full input guardrail = always-illegal content + harmful instructional intent.
const BANNED_PATTERNS = [...ALWAYS_ILLEGAL_PATTERNS, ...INSTRUCTIONAL_PATTERNS];

// Applied to the AI's *response*. These must match a genuine, CONTIGUOUS
// assistant refusal (e.g. "I cannot help you with this") — never scattered
// words spread across a long lesson. The old greedy `.*` version flagged
// ordinary teaching sentences ("...vaccines cannot give you ... this...") as
// unsafe, which is exactly the false-positive we are fixing here.
const BANNED_RESPONSE_PATTERNS = [
  /\bchild\b[^.!?]*\b(sexual|porn|molest)\b/i,
  /\bi\s+(?:cannot|can'?t|can\s?not|won'?t|will\s?not)\s+(?:help|assist)\b(?:\s+you)?\s+(?:with|on)\b/i,
  /\bi\s+(?:cannot|can'?t|can\s?not|won'?t|will\s?not)\s+(?:help|assist|comply)\s+with\s+(?:that|this|your)\b/i,
  /\bi\s+(?:cannot|can'?t|can\s?not|won'?t|will\s?not)\s+(?:provide|give|generate|create|write|produce)\s+(?:you\s+)?(?:that|this|such|any|the)?\s*(?:information|assistance|help|content|instructions?)\b/i,
  /\bi(?:'m|\s+am)\s+(?:not\s+able|unable)\s+to\s+(?:assist|help|provide|answer|comply)\b/i,
  /\bi'?m\s+sorry[, ]+but\s+i\s+(?:cannot|can'?t|can\s?not|won'?t|will\s?not)\b/i,
];

function matchesBannedPattern(text, patterns) {
  if (!text || typeof text !== "string") return false;
  const normalized = normalizeForModeration(text);
  return patterns.some((pattern) => pattern.test(normalized));
}

function containsProfanity(text) {
  if (!text || typeof text !== "string") return false;
  const normalized = normalizeForModeration(text);
  return profanityFilter.isProfane(normalized);
}

function containsBannedUserInput(text) {
  return matchesBannedPattern(text, BANNED_PATTERNS) || containsProfanity(text);
}

function containsBannedAIResponse(text) {
  // Output check = always-illegal content + genuine refusals + profanity layer.
  // We do NOT apply INSTRUCTIONAL_PATTERNS here: those describe a user asking
  // how to do harm, and firing them on a generated lesson wrongly blocks
  // legitimate educational content (history of the atomic bomb, chemistry, etc.).
  return (
    matchesBannedPattern(text, [
      ...ALWAYS_ILLEGAL_PATTERNS,
      ...BANNED_RESPONSE_PATTERNS,
    ]) || containsProfanity(text)
  );
}

function getUserInputBlockReason(text) {
  const normalized = normalizeForModeration(text);
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(normalized)) {
      return "Your question appears to contain content that violates our community guidelines. Please rephrase your request.";
    }
  }
  if (containsProfanity(text)) {
    return "Your question appears to contain content that violates our community guidelines. Please rephrase your request.";
  }
  return "Your question was flagged by our safety review. Please try a different question.";
}

function getAIResponseBlockReason(text) {
  const normalized = normalizeForModeration(text);
  for (const pattern of BANNED_RESPONSE_PATTERNS) {
    if (pattern.test(normalized)) {
      return "The generated content was flagged for review. Please try a different question or rephrase your request.";
    }
  }
  for (const pattern of ALWAYS_ILLEGAL_PATTERNS) {
    if (pattern.test(normalized)) {
      return "The generated content was flagged for review. Please try a different question or rephrase your request.";
    }
  }
  if (containsProfanity(text)) {
    return "The generated content was flagged for review. Please try a different question or rephrase your request.";
  }
  return "This content was flagged by our safety review. Please try a different question.";
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

    if (kind === "output") {
      blocked = containsBannedAIResponse(snippet);
      reason = getAIResponseBlockReason(snippet);
    } else {
      blocked = containsBannedUserInput(snippet);
      reason = getUserInputBlockReason(snippet);
    }

    if (blocked) {
      console.warn("[moderation] Content blocked by rule-based classifier", {
        kind,
        latencyMs: Date.now() - startedAt,
        reason,
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
