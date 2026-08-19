import test from "node:test";
import assert from "node:assert/strict";
import { alignQuizCorrectIndex, normalizeJourney, isValidJourney } from "../src/validation.js";

test("alignQuizCorrectIndex: leaves valid 0-indexed question untouched", () => {
  const q = {
    question: "What is the capital of France?",
    options: ["Berlin", "Paris", "Madrid", "Rome"],
    correctIndex: 1,
    explanation: "Paris is the capital of France.",
  };
  const result = alignQuizCorrectIndex(q);
  assert.equal(result.correctIndex, 1);
});

test("alignQuizCorrectIndex: corrects 1-based index off-by-one error", () => {
  const q = {
    question: "Why is 'stochastic compilation' controversial?",
    options: [
      "It removes the human-readable source code for auditing.",
      "It makes computers hot",
      "It requires internet",
      "It is illegal",
    ],
    correctIndex: 1, // LLM output 1 intending Option 1 (1-based index 1 = array slot 0)
    explanation: "Stochastic compilation removes human-readable source code, preventing security auditing.",
  };
  const result = alignQuizCorrectIndex(q);
  assert.equal(result.correctIndex, 0); // Corrected to 0-based index 0
});

test("alignQuizCorrectIndex: handles out-of-bounds 1-based index (4 for 4 options)", () => {
  const q = {
    question: "Which primary color is sky?",
    options: ["Red", "Green", "Yellow", "Blue"],
    correctIndex: 4, // 1-based for 4th option
    explanation: "Blue is the color of the sky.",
  };
  const result = alignQuizCorrectIndex(q);
  assert.equal(result.correctIndex, 3);
});

test("alignQuizCorrectIndex: matches exact correctAnswer text string", () => {
  const q = {
    question: "Why is 'stochastic compilation' controversial?",
    options: [
      "It removes the human-readable source code for auditing.",
      "It makes computers hot",
      "It requires internet",
      "It is illegal",
    ],
    correctAnswer: "It removes the human-readable source code for auditing.",
    correctIndex: 1, // Wrong index supplied by model, but text matches index 0
    explanation: "Auditing is impossible without source code.",
  };
  const result = alignQuizCorrectIndex(q);
  assert.equal(result.correctIndex, 0);
});

test("alignQuizCorrectIndex: matches option letter in correctAnswer or correctIndex", () => {
  const q = {
    question: "Which gas do plants absorb?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    correctAnswer: "B",
    explanation: "CO2 is absorbed.",
  };
  const result = alignQuizCorrectIndex(q);
  assert.equal(result.correctIndex, 1);
});

test("normalizeJourney: normalizes and aligns quiz questions in journey parts", () => {
  const journeyData = {
    topic: "Stochastic Compilation",
    parts: [
      {
        partNumber: 1,
        title: "Foundation",
        content: "Content about stochastic compilation and auditing.",
        sources: ["https://example.com"],
        quiz: [
          {
            question: "Why is 'stochastic compilation' controversial?",
            options: [
              "It removes the human-readable source code for auditing.",
              "It makes computers hot",
              "It requires internet",
              "It is illegal",
            ],
            correctAnswer: "It removes the human-readable source code for auditing.",
            correctIndex: 1,
            explanation: "Stochastic compilation removes human-readable source code, preventing security auditing.",
          },
        ],
      },
    ],
  };

  const normalized = normalizeJourney(journeyData, "fast");
  assert.equal(normalized.parts[0].quiz[0].correctIndex, 0);
});

test("normalizeJourney: salvages a question whose correctIndex is a letter string", () => {
  // Regression: alignQuizCorrectIndex now runs BEFORE the validity filter, so a
  // model that emits correctIndex: "B" (instead of an integer) is repaired to
  // index 1 rather than being dropped — which, in fast mode, would have
  // invalidated the whole single-part lesson.
  const journeyData = {
    topic: "Photosynthesis",
    parts: [
      {
        partNumber: 1,
        title: "Foundation",
        content: "Plants convert light energy into chemical energy.",
        sources: [],
        quiz: [
          {
            question: "Which gas do plants absorb during photosynthesis?",
            options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
            correctIndex: "B",
            explanation: "Plants absorb carbon dioxide.",
          },
        ],
      },
    ],
  };

  const normalized = normalizeJourney(journeyData, "fast");
  assert.equal(normalized.parts.length, 1);
  assert.equal(normalized.parts[0].quiz.length, 1);
  assert.equal(normalized.parts[0].quiz[0].correctIndex, 1);
});

test("isValidJourney: requires keyTakeaways within the mode's expected count", () => {
  const journeyData = {
    topic: "Photosynthesis",
    parts: [
      {
        partNumber: 1,
        title: "Foundation",
        content: "Plants convert light energy into chemical energy.",
        sources: [],
        quiz: [
          {
            question: "Which gas do plants absorb during photosynthesis?",
            options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
            correctIndex: 1,
            explanation: "Plants absorb carbon dioxide.",
          },
        ],
      },
    ],
  };

  // normalizeJourney pads missing keyTakeaways to the mode's count (1) → valid.
  const normalized = normalizeJourney(journeyData, "fast");
  assert.equal(normalized.keyTakeaways.length, 1);
  assert.ok(isValidJourney(normalized, "fast"));

  // Missing, empty, or over-count keyTakeaways all fail validation.
  assert.ok(!isValidJourney({ ...normalized, keyTakeaways: undefined }, "fast"));
  assert.ok(!isValidJourney({ ...normalized, keyTakeaways: [] }, "fast"));
  assert.ok(!isValidJourney({ ...normalized, keyTakeaways: ["a", "b"] }, "fast"));
  assert.ok(!isValidJourney({ ...normalized, keyTakeaways: ["a", "b", "c"] }, "fast"));
});
