// Guardrail philosophy:
// These patterns target genuinely harmful *intent* (requests for instructions to
// do harm, or sexual/exploitative content) — NOT the mere mention of a sensitive
// topic. Educational and historical subjects (e.g. World War 1 & 2, the atomic
// bomb, terrorism as a topic, the Holocaust) must remain answerable, so we avoid
// blanket keyword bans like "bomb" or "terror" that caused false positives.

const BANNED_PATTERNS = [
  // ── Child sexual abuse / exploitation — always blocked ──
  /child\s*(sexual|sex\b|porn|pornography|molest)/i,
  /\b(csam|cp)\b.*\b(child|minor|kid)/i,
  /(sexual|sexually)\s*(abus|exploit|explicit)\w*\s*(of\s*)?(a\s*)?(child|minor|kid)/i,
  /(child|minor|kid)s?\s*(sexual|sexually|porn|nude|naked)/i,
  /child\s*(bride|marriage)/i,

  // ── Sexual violence ──
  /\brape\b|sexual\s*(assault|violence)/i,
  /revenge\s*porn|non[\s-]*consensual\s*(sex|porn|image|photo)/i,
  /bestiality|zoophilia/i,

  // ── Weapons / explosives / drugs: block "how to make/build", not mentions ──
  /how\s*(to|do\s*i|can\s*i|can\s*you)\s*(make|build|construct|create|assemble|manufacture|3d\s*print)\s*(a|an|the)?\s*(bomb|explosive|ied|grenade|pipe\s*bomb|molotov|landmine)/i,
  /(bomb|explosive|ied)[\s-]*(making|building|recipe|instruction|tutorial|blueprint)/i,
  /how\s*(to|do\s*i|can\s*i|can\s*you)\s*(make|build|3d\s*print|manufacture|obtain|get)\s*(a|an|the)?\s*(gun|firearm|silencer|ghost\s*gun|untraceable\s*weapon)/i,
  /how\s*(to|do\s*i|can\s*i|can\s*you)\s*(make|synthesize|cook|manufacture|produce|grow)\s*(meth|methamphetamine|cocaine|crack|heroin|fentanyl|mdma|ecstasy|lsd|illegal\s*drugs)/i,

  // ── Violence against a person (instructional intent) ──
  /how\s*(to|do\s*i|can\s*i|can\s*you)\s*(kill|murder|poison|stab|strangle|assault|kidnap)\s*(someone|somebody|a\s*person|people|him|her|them|my\b)/i,
  /how\s*(to|do\s*i|can\s*i|can\s*you)\s*(get\s*away\s*with|commit)\s*(a\s*)?(murder|killing|crime)/i,
  /(plan|planning|carry\s*out|execute)\s*(a\s*)?(terror|terrorist|mass|school)\s*(attack|shooting|bombing)/i,
  // First-person / instructional THREAT against a specific human or place —
  // catches "I want to bomb my school", "how do I shoot up the class". A
  // concrete target is REQUIRED so historical/scientific mentions ("the atomic
  // bomb", "how do white blood cells kill bacteria", "how to shoot a
  // basketball") are never matched.
  /(going\s*to|want\s*to|wanna|plan(ning)?\s*to|how\s*(do\s*i|can\s*i))\s*(bomb|blow\s*up|shoot\s*up|stab|kill|murder|poison|behead|massacre|attack)\s+(everyone|someone|somebody|people|him|her|them|myself|kids|children|a\s*(child|kid|person|classmate|teacher|student)|my\s*(mom|dad|mother|father|sister|brother|teacher|classmate|friend|family|neighbou?r|wife|husband|ex|boss|parents?)|(my|our|the|a)\s*(school|class|classroom|mosque|temple|church|synagogue|office|mall|building|city|teacher|principal|students?))/i,

  // ── Self-harm / suicide encouragement or methods ──
  /how\s*(to|do\s*i|can\s*i)\s*(commit\s*)?(suicide|kill\s*myself|end\s*my\s*life)/i,
  /(best|fastest|painless|easiest|most\s*effective)\s*way\s*to\s*(die|kill\s*myself|commit\s*suicide)/i,
  /how\s*(to|do\s*i|can\s*i)\s*(cut|harm|hurt|injure)\s*myself/i,
  /suicide\s*(method|technique|pact)/i,

  // ── Hate content generation (intent to produce slurs/hate, not the topic) ──
  /(generate|write|give\s*me|create|tell\s*me\s*a)\s*[\w\s]*(hate\s*speech|racist\s*(joke|slur)|ethnic\s*slur|slurs?)/i,

  // ── Cybercrime / fraud (instructional intent) ──
  /how\s*(to|do\s*i|can\s*i|can\s*you)\s*(hack|breach|break\s*into)\b[\w\s'’.-]{0,40}?\b(bank|account|wi-?fi|password|email|phone|government|system|network|server|database)/i,
  /how\s*(to|do\s*i|can\s*i|can\s*you)\s*(steal|launder|counterfeit)\s*(money|cash|cards?|identit|funds)/i,
  /(credit\s*card|identity)\s*(theft|fraud)\s*(how|guide|tutorial|step|tips)/i,

  // ── Trafficking / smuggling (instructional intent) ──
  /how\s*(to|do\s*i|can\s*i|can\s*you)\s*(traffic|smuggle)\s*(people|humans|a\s*person|drugs|weapons)/i,
];

// Applied only to the AI's *response* — catches a model that slipped into a
// refusal or returned disallowed content despite the prompt.
const HARMFUL_REFUSAL_CONTEXT = "harmful|dangerous|illegal|unsafe|violent|weapon|bomb|explosive|drug|self-harm|suicide|abuse|sexual|hate|hacking|fraud|kidnap|traffick";

const BANNED_RESPONSE_PATTERNS = [
  /child\s*(sexual|porn|molest)/i,
  new RegExp(`i\\s*(cannot|can't|won't|will\\s*not)\\s*(help|assist|provide|give)[^.!?]{0,160}(${HARMFUL_REFUSAL_CONTEXT})`, "i"),
  new RegExp(`i['']m\\s*(not\\s*able|unable)\\s*to\\s*(assist|help|provide)[^.!?]{0,160}(${HARMFUL_REFUSAL_CONTEXT})`, "i"),
];

// SECURITY: strip zero-width/invisible characters and NFKC-fold before
// matching — "b​omb" (zero-width space inside the word) or fullwidth "ｂｏｍｂ"
// would otherwise slip past every word-boundary pattern below.
const INVISIBLE_CHARS_PATTERN = /[­͏؜᠎​-‏‪-‮⁠-⁤﻿]/g;

function matchesBannedPattern(text, patterns) {
  if (!text || typeof text !== "string") return false;
  const normalized = text
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  return patterns.some((pattern) => pattern.test(normalized));
}

function containsBannedUserInput(text) {
  return matchesBannedPattern(text, BANNED_PATTERNS);
}

function containsBannedAIResponse(text) {
  return matchesBannedPattern(text, [...BANNED_PATTERNS, ...BANNED_RESPONSE_PATTERNS]);
}

// Shared, INTENT-BASED harmful-content check (the union of the input + response
// pattern sets). Exposed so the moderation layer can reuse the same carefully
// scoped patterns instead of maintaining a parallel list of blanket keyword
// bans — the exact anti-pattern this module was written to avoid. See the
// header comment: sensitive TOPICS (the atomic bomb, terrorism, the Holocaust,
// how the immune system kills bacteria) must stay answerable; only harmful
// INTENT is blocked.
export function containsHarmfulContent(text) {
  return matchesBannedPattern(text, [...BANNED_PATTERNS, ...BANNED_RESPONSE_PATTERNS]);
}

export function filterUserInput(question) {
  if (!question || typeof question !== "string") return { allowed: true, filtered: question };
  const trimmed = question.trim();
  if (containsBannedUserInput(trimmed)) {
    return {
      allowed: false,
      reason: "Your question appears to contain content that violates our community guidelines. Please rephrase your request.",
      filtered: null,
    };
  }
  return { allowed: true, filtered: trimmed };
}

export function filterAIResponse(rawResponse) {
  if (!rawResponse || typeof rawResponse !== "string") return { allowed: true, filtered: rawResponse };
  if (containsBannedAIResponse(rawResponse)) {
    return {
      allowed: false,
      reason: "The generated content was flagged for review. Please try a different question or rephrase your request.",
      filtered: null,
    };
  }
  return { allowed: true, filtered: rawResponse };
}
