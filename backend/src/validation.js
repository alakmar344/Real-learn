const REQUIRED_PARTS_COUNT = 3;
const REQUIRED_KEY_TAKEAWAYS_COUNT = 3;
const REQUIRED_QUIZ_OPTIONS_COUNT = 4;

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

export function normalizeJourney(data) {
  if (!data || typeof data !== "object") return data;

  const normalized = { ...data };
  if (!normalized.question && normalized.topic) {
    normalized.question = normalized.topic;
  }

  if (Array.isArray(data.parts)) {
    const normalizedParts = data.parts
      .filter((part) => part && typeof part === "object")
      .sort(sortByPartNumber)
      .slice(0, REQUIRED_PARTS_COUNT)
      .map((part, index) => ({
        ...part,
        partNumber: index + 1,
        sources: Array.isArray(part.sources) ? part.sources : [],
      }));
    normalized.parts = normalizedParts;
  }

  if (Array.isArray(data.keyTakeaways)) {
    normalized.keyTakeaways = data.keyTakeaways.slice(0, REQUIRED_KEY_TAKEAWAYS_COUNT);
  }

  return normalized;
}

export function isValidJourney(data) {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.parts) || data.parts.length !== REQUIRED_PARTS_COUNT) return false;
  if (
    !Array.isArray(data.keyTakeaways) ||
    data.keyTakeaways.length !== REQUIRED_KEY_TAKEAWAYS_COUNT
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
