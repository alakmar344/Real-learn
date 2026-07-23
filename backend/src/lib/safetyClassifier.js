import { Filter } from "bad-words";

const profanityFilter = new Filter();

// bad-words is intentionally broad and includes some terms that are normal in
// educational, religious, health, literature, and sports contexts. RealLearn is
// for 13+ learners, so keep actual profanity blocked but do not block ordinary
// school questions like “How does AI work?”, “What does Islam teach?”, or
// cricket coaching because of a single ambiguous word in a generated lesson.
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
  "trafficking",
  "humantrafficking",
  "sextrafficking",
  "childtrafficking",
  "torture",
  "torturing",
  "tortured",
  "grooming"
);

const LEET_MAP = {
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

const INVISIBLE_CHARS_PATTERN = /[­͏؜᠎​-‏‪-‮⁠-⁤﻿]/g;

export function normalizeForSafety(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS_PATTERN, "")
    .toLowerCase()
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

const ALWAYS_BLOCK_PATTERNS = [
  /\bchild\b[^.!?]*\b(sexual|sex|porn|pornography|molest|nude|naked)\b/i,
  /\b(child|minor|kid)\b[^.!?]*\b(csam|cp)\b/i,
  /\b(sexual|sexually)\b[^.!?]*\b(abuse|exploit|explicit)\b[^.!?]*\b(child|minor|kid)\b/i,
  /\brape\b|\bsexual\b[^.!?]*\b(assault|violence)\b/i,
  /\brevenge\s*porn\b|\bnon[\s-]*consensual\b[^.!?]*\b(sex|porn|image|photo)\b/i,
  /\b(bestiality|zoophilia)\b/i,
];

const INPUT_INTENT_PATTERNS = [
  /\bhow\b[^.!?]{0,120}\b(make|build|construct|create|assemble|manufacture|3d\s*print)\b[^.!?]{0,120}\b(bomb|explosive|ied|grenade|pipe\s*bomb|molotov|landmine)\b/i,
  /\bhow\b[^.!?]{0,120}\b(make|build|3d\s*print|manufacture|obtain|get)\b[^.!?]{0,120}\b(gun|firearm|silencer|ghost\s*gun|untraceable\s*weapon)\b/i,
  /\bhow\b[^.!?]{0,120}\b(make|synthesize|cook|manufacture|produce|grow)\b[^.!?]{0,120}\b(meth|methamphetamine|cocaine|crack|heroin|fentanyl|mdma|ecstasy|lsd|illegal\s*drugs)\b/i,
  /\bhow\b[^.!?]{0,120}\b(kill|murder|poison|stab|strangle|assault|kidnap|abduct)\b[^.!?]{0,120}\b(someone|somebody|a\s*person|people|him|her|them|my|child|children)\b/i,
  /\bhow\b[^.!?]{0,120}\b(commit\s*)?(suicide|kill\s*myself|end\s*my\s*life)\b/i,
  /\b(best|fastest|painless|easiest|most\s*effective)\b[^.!?]{0,120}\bway\b[^.!?]{0,120}\b(die|kill\s*myself|commit\s*suicide)\b/i,
  /\bhow\b[^.!?]{0,120}\b(hack|breach|break\s*into)\b[^.!?]{0,120}\b(bank|account|wifi|wi-fi|password|email|phone|government|system|network|server)\b/i,
  /\bhow\b[^.!?]{0,120}\b(steal|launder|counterfeit)\b[^.!?]{0,120}\b(money|cash|cards?|identit|funds)\b/i,
  /\bhow\b[^.!?]{0,120}\b(traffic|smuggle)\b[^.!?]{0,120}\b(people|humans|a\s*person|drugs|weapons)\b/i,
];

const HARMFUL_REFUSAL_CONTEXT = "harmful|dangerous|illegal|unsafe|violent|weapon|bomb|explosive|drug|self-harm|suicide|abuse|sexual|hate|hacking|fraud|kidnap|traffick";
const OUTPUT_REFUSAL_PATTERNS = [
  new RegExp(`\\bi\\s+(?:cannot|can'?t|can\\s?not|won'?t|will\\s?not)\\s+(?:help|assist|comply|provide|give|generate|create|write|produce)[^.!?]{0,160}\\b(?:${HARMFUL_REFUSAL_CONTEXT})\\b`, "i"),
  new RegExp(`\\bi(?:'m|\\s+am)\\s+(?:not\\s+able|unable)\\s+to\\s+(?:assist|help|provide|answer|comply)[^.!?]{0,160}\\b(?:${HARMFUL_REFUSAL_CONTEXT})\\b`, "i"),
];

function matchesAny(normalized, patterns) {
  return patterns.some((pattern) => pattern.test(normalized));
}

export function classifyTextFor13Plus(text, kind = "input") {
  if (!text || typeof text !== "string" || !text.trim()) return { allowed: true };
  const normalized = normalizeForSafety(text);
  if (matchesAny(normalized, ALWAYS_BLOCK_PATTERNS)) {
    return { allowed: false, source: "policy", category: "always-block" };
  }
  if (kind === "input" && matchesAny(normalized, INPUT_INTENT_PATTERNS)) {
    return { allowed: false, source: "policy", category: "harmful-instruction" };
  }
  if (kind === "output" && matchesAny(normalized, OUTPUT_REFUSAL_PATTERNS)) {
    return { allowed: false, source: "policy", category: "harmful-refusal" };
  }
  if (profanityFilter.isProfane(normalized)) {
    return { allowed: false, source: "bad-words", category: "profanity" };
  }
  return { allowed: true };
}
