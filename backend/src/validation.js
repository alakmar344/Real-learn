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

  if (Array.isArray(data.parts)) {
    const normalizedParts = data.parts
      .filter((part) => part && typeof part === "object")
      .sort(sortByPartNumber)
      .slice(0, 3)
      .map((part, index) => ({
        ...part,
        partNumber: index + 1,
      }));
    normalized.parts = normalizedParts;
  }

  if (Array.isArray(data.keyTakeaways)) {
    normalized.keyTakeaways = data.keyTakeaways.slice(0, 3);
  }

  return normalized;
}

export function isValidJourney(data) {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.parts) || data.parts.length !== 3) return false;
  if (!Array.isArray(data.keyTakeaways) || data.keyTakeaways.length !== 3) {
    return false;
  }

  return data.parts.every(
    (part, index) =>
      part?.partNumber === index + 1 &&
      typeof part.title === "string" &&
      typeof part.content === "string" &&
      Array.isArray(part.quiz) &&
      part.quiz.length === 2 &&
      part.quiz.every(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          Number.isInteger(q.correctIndex) &&
          q.correctIndex >= 0 &&
          q.correctIndex <= q.options.length - 1 &&
          typeof q.explanation === "string"
      )
  );
}
