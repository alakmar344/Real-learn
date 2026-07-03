const REQUIRED_QUIZ_OPTIONS_COUNT = 4;

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
      .sort(sortByPartNumber)
      .slice(0, rules.partsCount)
      .map((part, index) => ({
        ...part,
        partNumber: index + 1,
        sources: Array.isArray(part.sources) ? part.sources : [],
      }));
    normalized.parts = normalizedParts;
  }

  if (Array.isArray(data.keyTakeaways)) {
    normalized.keyTakeaways = data.keyTakeaways.slice(0, rules.keyTakeawaysCount);
  }

  return normalized;
}

export function isValidJourney(data, mode = "explain") {
  if (!data || typeof data !== "object") return false;
  const rules = getModeRules(mode);
  if (!Array.isArray(data.parts) || data.parts.length !== rules.partsCount) return false;
  if (
    !Array.isArray(data.keyTakeaways) ||
    data.keyTakeaways.length < 1 ||
    data.keyTakeaways.length > rules.keyTakeawaysCount
  ) {
    return false;
  }

  return data.parts.every(
    (part, index) =>
      part?.partNumber === index + 1 &&
      typeof part.title === "string" &&
      typeof part.content === "string" &&
      Array.isArray(part.sources) &&
      Array.isArray(part.quiz) &&
      part.quiz.length === 2 &&
      part.quiz.every(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === REQUIRED_QUIZ_OPTIONS_COUNT &&
          Number.isInteger(q.correctIndex) &&
          q.correctIndex >= 0 &&
          q.correctIndex < q.options.length &&
          typeof q.explanation === "string"
      )
  );
}
