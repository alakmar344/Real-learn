"use client";

import { useMemo, useState } from "react";
import { QuizQuestion as Question } from "@/types";
import QuizQuestion from "@/components/learning/QuizQuestion";

const TOTAL_QUESTIONS = 2;
const LAST_QUESTION_INDEX = TOTAL_QUESTIONS - 1;
const PERFECT_SCORE = TOTAL_QUESTIONS;

interface Props {
  open: boolean;
  questions: Question[];
  onClose: () => void;
  onPass: (score: number) => void;
}

export default function QuizSheet({ open, questions, onClose, onPass }: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(
    Array.from({ length: TOTAL_QUESTIONS }, () => null)
  );

  const currentQuestion = questions[current];
  const selected = answers[current];
  const answered = selected !== null;

  const score = useMemo(
    () =>
      answers.reduce(
        (acc: number, answer, i) =>
          acc + (answer === questions[i]?.correctIndex ? 1 : 0),
        0
      ),
    [answers, questions]
  );

  if (!open) return null;

  const selectAnswer = (index: number) => {
    if (answered) return;
    const next = [...answers];
    next[current] = index;
    setAnswers(next);
  };

  const nextAction = () => {
    if (current < LAST_QUESTION_INDEX) {
      setCurrent((prev) => prev + 1);
      return;
    }

    if (score === PERFECT_SCORE) {
      onPass(score);
      setCurrent(0);
      setAnswers(Array.from({ length: TOTAL_QUESTIONS }, () => null));
      return;
    }

    setCurrent(0);
    setAnswers(Array.from({ length: TOTAL_QUESTIONS }, () => null));
  };

  return (
    <div
      onClick={answered ? undefined : onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 90,
      }}
    >
      <div
        className="animate-slide-bottom"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border-default)",
          borderRadius: "24px 24px 0 0",
          padding: "0 24px 40px",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#333", margin: "12px auto 20px" }} />
        <h3 style={{ margin: 0, fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: 18 }}>Quick Check</h3>
        <p style={{ marginTop: 6, marginBottom: 16, fontSize: 13, color: "var(--text-secondary)" }}>
          2 questions about what you just read
        </p>
        <div style={{ borderBottom: "1px solid rgba(245,197,24,0.2)", marginBottom: 16 }} />

        <QuizQuestion
          question={currentQuestion}
          index={current}
          selectedIndex={selected}
          answered={answered}
          onSelect={selectAnswer}
        />

        {answered ? (
          <button
            type="button"
            onClick={nextAction}
            style={{
              marginTop: 18,
              width: "100%",
              borderRadius: 10,
              padding: "12px",
              border:
                score === PERFECT_SCORE && current === LAST_QUESTION_INDEX
                  ? "none"
                  : "1.5px solid var(--border-default)",
              background:
                score === PERFECT_SCORE && current === LAST_QUESTION_INDEX
                  ? "var(--correct)"
                  : "transparent",
              color:
                score === PERFECT_SCORE && current === LAST_QUESTION_INDEX
                  ? "white"
                  : "var(--text-primary)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {current < LAST_QUESTION_INDEX
              ? "Next Question →"
              : score === PERFECT_SCORE
                ? "Unlock Next Part →"
                : "Read Again"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
