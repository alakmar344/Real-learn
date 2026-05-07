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
          typeof q.correctIndex === "number"
      )
  );
}
