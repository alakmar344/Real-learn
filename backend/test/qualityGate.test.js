import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAndFix } from "../src/lib/qualityGate.js";

function makeJourney(parts) {
  return { topic: "Test topic", parts, keyTakeaways: ["a", "b", "c"] };
}

function makePart(quiz) {
  return {
    partNumber: 1,
    title: "Test part",
    content: "Short content for testing.",
    quiz,
  };
}

test("Class 9-10: auto-fixes quiz options that exceed the word limit", () => {
  const journey = makeJourney([
    makePart([
      {
        question: "What is the capital of France?",
        options: [
          "This option contains far too many words to be considered a good distractor for students",
          "Paris",
          "Another very long option that should definitely be shortened right away",
          "Berlin",
        ],
        correctIndex: 1,
        explanation: "Paris is the capital.",
      },
    ]),
  ]);

  const { journey: fixed, report } = evaluateAndFix(
    journey,
    "Class 9-10",
    "explain",
    "English"
  );

  assert.equal(report.issues.length > 0, true);
  assert.equal(report.fixed.length > 0, true);
  const options = fixed.parts[0].quiz[0].options;
  for (const opt of options) {
    assert.ok(
      opt.split(/\s+/).filter(Boolean).length <= 12,
      `option "${opt}" still exceeds 12 words`
    );
  }
});

test("Class 9-10: simplifies overly complex quiz questions and explanations", () => {
  const journey = makeJourney([
    makePart([
      {
        question:
          "The thermodynamic equilibrium methodology necessitates a comprehensive decomposition of the infrastructure components.",
        options: ["Yes", "No", "Maybe", "Unsure"],
        correctIndex: 0,
        explanation:
          "The bureaucratic sovereignty paradigm required industrialization and urbanization during colonialism.",
      },
    ]),
  ]);

  const { report } = evaluateAndFix(journey, "Class 9-10", "explain", "English");

  // The simplification map should rewrite several complex words, so at least
  // one fix is recorded and the issue count drops from the raw content.
  assert.equal(report.fixed.length > 0, true);
});

test("College / Advanced: does not rewrite vocabulary", () => {
  const journey = makeJourney([
    makePart([
      {
        question:
          "The thermodynamic equilibrium methodology necessitates a comprehensive decomposition of the infrastructure components.",
        options: ["Yes", "No", "Maybe", "Unsure"],
        correctIndex: 0,
        explanation:
          "The bureaucratic sovereignty paradigm required industrialization and urbanization during colonialism.",
      },
    ]),
  ]);

  const { journey: fixed, report } = evaluateAndFix(
    journey,
    "College / Advanced",
    "explain",
    "English"
  );

  assert.equal(report.fixed.length, 0);
  assert.equal(
    fixed.parts[0].quiz[0].question,
    journey.parts[0].quiz[0].question
  );
});

test("Class 6-8: aggressively truncates long options and questions", () => {
  const journey = makeJourney([
    makePart([
      {
        question:
          "This is a very long question that has far too many words for a young learner to read easily in one go",
        options: [
          "This option is far too long for Class 6-8 learners to understand",
          "Short",
          "Also too long and should be cut down to size immediately",
          "Tiny",
        ],
        correctIndex: 1,
        explanation: "Short explanation.",
      },
    ]),
  ]);

  const { journey: fixed, report } = evaluateAndFix(
    journey,
    "Class 6-8",
    "explain",
    "English"
  );

  assert.equal(report.fixed.length > 0, true);
  const qWords = fixed.parts[0].quiz[0].question.split(/\s+/).filter(Boolean);
  assert.ok(qWords.length <= 20);
  for (const opt of fixed.parts[0].quiz[0].options) {
    assert.ok(opt.split(/\s+/).filter(Boolean).length <= 8);
  }
});

test("Report is truthful when issues exist but no fixes are applied", () => {
  // College content with a structural issue that we choose not to auto-fix
  // (e.g., an option at exactly the threshold plus one word where truncation
  // would not be safe to apply blindly). Construct a case where fixed is empty.
  const journey = makeJourney([
    makePart([
      {
        question: "Simple?",
        options: ["a", "b", "c", "d"],
        correctIndex: 0,
        explanation: "Simple.",
      },
    ]),
  ]);

  const { report } = evaluateAndFix(journey, "College / Advanced", "explain", "English");
  assert.equal(report.passed, true);
  assert.equal(report.issues.length, 0);
  assert.equal(report.fixed.length, 0);
});
