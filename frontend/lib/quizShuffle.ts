import type { QuizQuestion } from "../types";

/** Fisher-Yates shuffle of an index array [0, length). */
export function shuffledIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Return a copy of the question with its options re-ordered. The correct answer
 * is guaranteed to land in a DIFFERENT position than it currently occupies (when
 * there is more than one option), and `correctIndex` is kept in sync so it still
 * points at the genuinely correct option after shuffling.
 */
export function reshuffleQuestion(question: QuizQuestion): QuizQuestion {
  const options = question.options ?? [];
  if (options.length <= 1) return question;

  const currentCorrect = question.correctIndex;
  const order = shuffledIndices(options.length);

  // Guarantee the correct answer moves: if the shuffle happened to leave it in
  // its original slot, swap that slot with a neighbour. With >1 option this
  // always yields a new, valid position (no probability involved).
  const correctSlot = order.indexOf(currentCorrect);
  if (correctSlot === currentCorrect) {
    const neighbour = (correctSlot + 1) % order.length;
    [order[correctSlot], order[neighbour]] = [order[neighbour], order[correctSlot]];
  }

  return {
    ...question,
    options: order.map((i) => options[i]),
    correctIndex: order.indexOf(currentCorrect),
  };
}
