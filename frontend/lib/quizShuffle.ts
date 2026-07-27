import type { QuizQuestion } from "../types";

/** Fisher-Yates shuffle — returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Defensive alignment on client-side: ensures `correctIndex` is 0-indexed and within bounds.
 * If 1-based index is out of bounds (correctIndex === options.length) or if correctIndex - 1 matches
 * explanation text better, corrects it to 0-based.
 */
export function sanitizeQuestion(question: QuizQuestion): QuizQuestion {
  if (!question || !Array.isArray(question.options) || question.options.length === 0) {
    return question;
  }

  const options = question.options;
  let correctIndex = typeof question.correctIndex === "number" ? question.correctIndex : 0;

  if (correctIndex >= options.length && correctIndex === options.length) {
    correctIndex = options.length - 1;
  } else if (correctIndex < 0) {
    correctIndex = 0;
  }

  const explanation = typeof question.explanation === "string" ? question.explanation.toLowerCase() : "";
  if (explanation) {
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "to", "from", "in", "out",
      "on", "off", "over", "under", "again", "further", "then", "once", "here",
      "there", "when", "where", "why", "how", "all", "any", "both", "each",
      "few", "more", "most", "other", "some", "such", "no", "nor", "not",
      "only", "own", "same", "so", "than", "too", "very", "can", "will",
      "just", "should", "now", "it", "its", "this", "that", "these", "those",
      "and", "but", "or", "if", "because", "as", "until", "while", "of", "at",
      "by", "for", "with", "about", "against", "between", "into", "through"
    ]);

    const getTokens = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

    const expTokens = getTokens(explanation);

    const scores = options.map((opt) => {
      if (typeof opt !== "string") return 0;
      const cleanOpt = opt.toLowerCase().trim();
      if (!cleanOpt) return 0;
      if (explanation.includes(cleanOpt) || cleanOpt.includes(explanation)) return 100;
      const tokens = getTokens(cleanOpt);
      if (tokens.length === 0) return 0;
      const matches = tokens.filter((t) => expTokens.includes(t) || explanation.includes(t)).length;
      return (matches / tokens.length) * 10;
    });

    const bestScore = Math.max(...scores);
    const bestIndex = scores.indexOf(bestScore);

    if (
      correctIndex >= 1 &&
      correctIndex <= options.length &&
      scores[correctIndex - 1] > scores[correctIndex] &&
      scores[correctIndex - 1] > 0
    ) {
      correctIndex = correctIndex - 1;
    } else if (bestScore > 0 && scores[correctIndex] === 0 && bestIndex !== correctIndex) {
      correctIndex = bestIndex;
    }
  }

  if (correctIndex < 0) correctIndex = 0;
  if (correctIndex >= options.length) correctIndex = options.length - 1;

  return {
    ...question,
    correctIndex,
  };
}

/**
 * Return a copy of the question with its options re-ordered. The correct answer
 * is guaranteed to land in a DIFFERENT position than it currently occupies (when
 * there is more than one option), and `correctIndex` is kept in sync so it still
 * points at the genuinely correct option after shuffling.
 */
export function reshuffleQuestion(question: QuizQuestion): QuizQuestion {
  const q = sanitizeQuestion(question);
  const options = q.options ?? [];
  if (options.length <= 1) return q;

  const currentCorrect = q.correctIndex;
  const order = shuffle(options.map((_, i) => i));

  // Guarantee the correct answer moves: if the shuffle happened to leave it in
  // its original slot, swap that slot with a neighbour. With >1 option this
  // always yields a new, valid position (no probability involved).
  const correctSlot = order.indexOf(currentCorrect);
  if (correctSlot === currentCorrect) {
    const neighbour = (correctSlot + 1) % order.length;
    [order[correctSlot], order[neighbour]] = [order[neighbour], order[correctSlot]];
  }

  return {
    ...q,
    options: order.map((i) => options[i]),
    correctIndex: order.indexOf(currentCorrect),
  };
}
