const REQUIRED_QUIZ_OPTIONS_COUNT = 4;
const MAX_SOURCES_PER_PART = 5;
const MAX_SOURCE_URL_LENGTH = 500;

// SECURITY: the model's `sources` array is attacker-influenceable output that
// is cached and served to EVERY future user asking the same question. Only
// well-formed http(s) URLs may pass — a `javascript:`/`data:` scheme (or any
// non-string junk) would otherwise become a stored-XSS payload the moment any
// client renders it as a link href.
export function sanitizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  const clean = [];
  for (const source of sources) {
    if (typeof source !== "string") continue;
    const trimmed = source.trim();
    if (!trimmed || trimmed.length > MAX_SOURCE_URL_LENGTH) continue;
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      clean.push(url.href);
    } catch {
      continue; // not a parseable absolute URL — drop it
    }
    if (clean.length >= MAX_SOURCES_PER_PART) break;
  }
  return clean;
}

// Per-mode structural expectations.
// - "explain": the classic 3-part learning journey.
// - "fast": one direct answer part, two quick takeaways.
const MODE_RULES = {
  explain: { partsCount: 3, keyTakeawaysCount: 3 },
  fast: { partsCount: 1, keyTakeawaysCount: 2 },
};

export function getModeRules(mode) {
  return MODE_RULES[mode] ?? MODE_RULES.explain;
}

// A quiz question is usable only when fully formed. Truncated output can
// leave a trailing half-question; we salvage the complete ones instead of
// rejecting the whole lesson.
function isValidQuizQuestion(q) {
  return (
    q &&
    typeof q === "object" &&
    typeof q.question === "string" &&
    q.question.trim().length > 0 &&
    Array.isArray(q.options) &&
    q.options.length === REQUIRED_QUIZ_OPTIONS_COUNT &&
    q.options.every((opt) => typeof opt === "string") &&
    Number.isInteger(q.correctIndex) &&
    q.correctIndex >= 0 &&
    q.correctIndex < q.options.length &&
    typeof q.explanation === "string"
  );
}

function sortByPartNumber(a, b) {
  const aHasPartNumber = Number.isInteger(a?.partNumber) && a.partNumber > 0;
  const bHasPartNumber = Number.isInteger(b?.partNumber) && b.partNumber > 0;
  if (aHasPartNumber && bHasPartNumber) {
    return a.partNumber - b.partNumber;
  }
  if (aHasPartNumber) return -1;
  if (bHasPartNumber) return 1;
  return 0;
}

export function normalizeJourney(data, mode = "explain") {
  if (!data || typeof data !== "object") return data;
  const rules = getModeRules(mode);

  const normalized = { ...data, mode };
  if (!normalized.question && normalized.topic) {
    normalized.question = normalized.topic;
  }

  if (Array.isArray(data.parts)) {
    const normalizedParts = data.parts
      .filter((part) => part && typeof part === "object")
      // Salvage: keep only complete quiz questions (truncated output can leave
      // a half-written trailing question that would otherwise invalidate the
      // whole lesson — fatal in fast mode where there is only one part).
      .map((part) => ({
        ...part,
        quiz: Array.isArray(part.quiz)
          ? part.quiz.filter(isValidQuizQuestion).slice(0, 2)
          : [],
      }))
      // A part is only usable with a title, content, and at least one
      // complete quiz question.
      .filter(
        (part) =>
          typeof part.title === "string" &&
          typeof part.content === "string" &&
          part.content.trim().length > 0 &&
          part.quiz.length >= 1
      )
      .sort(sortByPartNumber)
      .slice(0, rules.partsCount)
      .map((part, index) => ({
        ...part,
        partNumber: index + 1,
        // Security: only clean, absolute http(s) URLs survive normalization —
        // see sanitizeSources above.
        sources: sanitizeSources(part.sources),
      }));
    normalized.parts = normalizedParts;
  }

  if (!Array.isArray(data.keyTakeaways) || data.keyTakeaways.length === 0) {
    const partsForTakeaways = Array.isArray(normalized.parts) ? normalized.parts : [];
    normalized.keyTakeaways = Array(rules.keyTakeawaysCount)
      .fill("")
      .map((_, i) =>
        partsForTakeaways[i]?.title
          ? `Key insight: ${partsForTakeaways[i].title}`
          : `Key insight ${i + 1}`
      );
  } else {
    normalized.keyTakeaways = data.keyTakeaways
      .filter((t) => typeof t === "string" && t.trim().length > 0)
      .slice(0, rules.keyTakeawaysCount);
  }

  return normalized;
}

export function isValidJourney(data, mode = "explain") {
  if (!data || typeof data !== "object") return false;
  const rules = getModeRules(mode);
  if (!Array.isArray(data.parts) || data.parts.length < 1) return false;
  if (data.parts.length > rules.partsCount) return false;

  return data.parts.every(
    (part, index) =>
      part?.partNumber === index + 1 &&
      typeof part.title === "string" &&
      typeof part.content === "string" &&
      Array.isArray(part.sources) &&
      Array.isArray(part.quiz) &&
      // Accept 1-2 complete quiz questions. Requiring exactly 2 made any
      // truncation fatal — especially in fast mode, whose single part has no
      // slack (explain mode could drop a trailing part and still validate).
      part.quiz.length >= 1 &&
      part.quiz.length <= 2 &&
      part.quiz.every(isValidQuizQuestion)
  );
}

export function hasExpectedPartCount(data, mode = "explain") {
  if (!data || typeof data !== "object" || !Array.isArray(data.parts)) return false;
  const rules = getModeRules(mode);
  return data.parts.length === rules.partsCount;
}
