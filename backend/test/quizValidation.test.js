import test from "node:test";
import assert from "node:assert/strict";
import { alignQuizCorrectIndex, normalizeJourney } from "../src/validation.js";

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
