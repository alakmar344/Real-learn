const BANNED_PATTERNS = [
  /child\s*(sexual|porn|molest|abuse)/i,
  /rape|sexual\s*violence/i,
  /how\s*to\s*(kill|murder|harm|hurt|assault)/i,
  /bomb|terror|terrorist|terrorism/i,
  /suicide|self[\s-]*harm|self[\s-]*injury/i,
  /hate\s*(speech|crime)|racist|racism|sexist|homophob/i,
  /drug\s*(manufacture|cook|make|synthesize)|how\s*to\s*make\s*drugs/i,
  /human\s*(trafficking|smuggling|cult)/i,
  /child\s*labor|child\s*bride/i,
  /revenge\s*porn|non[\s-]*consensual/i,
  /bestiality|zoophilia/i,
  /cannibal/i,
  /hack\s*(bank|account|password|government)/i,
  /identity\s*theft|fraud\s*(scheme|plan)/i,
  /how\s*to\s*steal|how\s*to\s*rob|how\s*to\s*burglar/i,
  /weapon\s*(manufacture|modify|3d\s*print)/i,
  /explosive\s*(device|material|make)/i,
  /poison\s*(someone|make|manufacture)/i,
  /abuse\s*(child|minor|kid|children)/i,
];

const BANNED_RESPONSE_PATTERNS = [
  /child\s*(sexual|porn|molest|abuse)/i,
  /i\s*(cannot|won't|will\s*not)\s*(help|assist|provide|give)\s*(with|you|on)\s*(this|that|harmful|dangerous)/i,
  /i['']m\s*(not\s*able|unable)\s*to\s*(assist|help|provide)/i,
];

function matchesBannedPattern(text, patterns) {
  if (!text || typeof text !== "string") return false;
  const normalized = text.replace(/\s+/g, " ").trim();
  return patterns.some((pattern) => pattern.test(normalized));
}

export function containsBannedUserInput(text) {
  return matchesBannedPattern(text, BANNED_PATTERNS);
}

export function containsBannedAIResponse(text) {
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
