/**
 * Verifies that quiz shuffling on retake keeps `correctIndex` pointing at the
 * genuinely correct option (the AI's real answer) — and that the correct answer
 * always MOVES to a new position so the learner has to find it again.
 *
 * It imports the SAME module the app uses (lib/quizShuffle.ts), so it tests the
 * real logic, not a copy.
 *
 *   Run:  node scripts/verify-quiz-shuffle.mjs
 *         (or: npm run verify:quiz)
 *
 * Requires Node >= 22.18 (native TypeScript type-stripping for the .ts import).
 */
import { reshuffleQuestion } from "../lib/quizShuffle.ts";

const ROUNDS = 50000;

// A few representative questions. correctIndex marks the AI's real answer.
const questions = [
  {
    question: "What is the capital of France?",
    options: ["Berlin", "Paris", "Madrid", "Rome"],
    correctIndex: 1,
    explanation: "Paris is the capital of France.",
  },
  {
    question: "Which gas do plants primarily absorb?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    correctIndex: 1,
    explanation: "Plants absorb CO2 for photosynthesis.",
  },
  {
    question: "Pick the true/false answer.",
    options: ["True", "False"],
    correctIndex: 0,
    explanation: "Two-option edge case.",
  },
];

let failures = 0;
let movedCount = 0;
let movableRounds = 0;

for (const original of questions) {
  // The genuinely-correct option text never changes across retakes.
  const realAnswerText = original.options[original.correctIndex];
  let q = original;

  for (let round = 0; round < ROUNDS; round += 1) {
    const prevCorrectIndex = q.correctIndex;
    const next = reshuffleQuestion(q);

    // 1) correctIndex must still point at the real answer text.
    if (next.options[next.correctIndex] !== realAnswerText) {
      failures += 1;
      console.error(
        `[FAIL] correctIndex points at "${next.options[next.correctIndex]}" but real answer is "${realAnswerText}"`
      );
    }

    // 2) No option may be lost, duplicated, or altered.
    const before = [...q.options].sort().join("|");
    const after = [...next.options].sort().join("|");
    if (before !== after) {
      failures += 1;
      console.error(`[FAIL] option set changed: ${before}  ->  ${after}`);
    }

    // 3) correctIndex must stay within bounds.
    if (next.correctIndex < 0 || next.correctIndex >= next.options.length) {
      failures += 1;
      console.error(`[FAIL] correctIndex out of bounds: ${next.correctIndex}`);
    }

    // 4) With >1 option, the correct answer must move to a NEW position.
    if (next.options.length > 1) {
      movableRounds += 1;
      if (next.correctIndex !== prevCorrectIndex) movedCount += 1;
      else {
        failures += 1;
        console.error(
          `[FAIL] correct answer did not move (stayed at index ${prevCorrectIndex})`
        );
      }
    }

    q = next; // chain retakes, just like real repeated attempts
  }
}

const totalChecks = questions.length * ROUNDS;
console.log(`Checked ${totalChecks.toLocaleString()} reshuffles across ${questions.length} questions.`);
console.log(`Correct answer moved on ${movedCount.toLocaleString()}/${movableRounds.toLocaleString()} eligible retakes.`);

if (failures === 0) {
  console.log("✅ PASS — after shuffling, correctIndex always points to the real answer, and it always moves.");
  process.exit(0);
} else {
  console.error(`❌ FAIL — ${failures} problem(s) detected.`);
  process.exit(1);
}
