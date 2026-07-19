"use client";

import { useCallback, useRef, memo } from "react";
import { QuizQuestion as Question } from "@/types";

interface Props {
  question: Question;
  index: number;
  totalQuestions: number;
  selectedIndex: number | null;
  answered: boolean;
  onSelect: (index: number) => void;
}

const letters = ["A", "B", "C", "D"];

const QuizQuestionBase = ({
  question,
  index,
  totalQuestions,
  selectedIndex,
  answered,
  onSelect,
}: Props) => {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const options = question.options ?? [];
  const optionCount = options.length;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, optionIndex: number) => {
      if (answered) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(optionIndex);
        return;
      }
      let next = -1;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        next = (optionIndex + 1) % optionCount;
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        next = (optionIndex - 1 + optionCount) % optionCount;
      }
      if (next >= 0) {
        optionRefs.current[next]?.focus();
      }
    },
    [answered, onSelect, optionCount]
  );

  return (
    <div role="group" aria-label={`Question ${index + 1} of ${totalQuestions}`} className="quiz-question">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: "var(--radius-sm)",
            background: "var(--accent-dim)",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {index + 1}
        </span>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Question {index + 1} of {totalQuestions}
        </p>
      </div>

      <p style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>
        {question.question}
      </p>

      <div role="radiogroup" aria-label="Answer options">
        {options.map((option, optionIndex) => {
          const isSelected = selectedIndex === optionIndex;
          const isCorrect = question.correctIndex === optionIndex;
          const showCorrectAnswer = answered && isCorrect;
          const isWrongSelected = answered && isSelected && !isCorrect;

          let background = "var(--bg-surface)";
          let border = "1.5px solid var(--border-default)";
          let color = "var(--text-primary)";

          if (showCorrectAnswer) {
            background = "var(--correct-bg)";
            border = "1.5px solid color-mix(in srgb, var(--correct) 45%, transparent)";
            color = "var(--text-primary)";
          }

          if (isWrongSelected) {
            background = "var(--wrong-bg)";
            border = "1.5px solid color-mix(in srgb, var(--wrong) 45%, transparent)";
            color = "var(--text-primary)";
          }

          return (
            <button
              key={`${optionIndex}-${option}`}
              ref={(el) => { optionRefs.current[optionIndex] = el; }}
              type="button"
              role="radio"
              aria-checked={isSelected ?? false}
              aria-label={`Option ${letters[optionIndex]}: ${option}${answered && isCorrect ? " – Correct answer" : ""}${answered && isWrongSelected ? " – Incorrect" : ""}`}
              disabled={answered}
              onClick={() => onSelect(optionIndex)}
              onKeyDown={(e) => handleKeyDown(e, optionIndex)}
              className={isWrongSelected ? "animate-shake" : showCorrectAnswer && isSelected ? "animate-correct-pulse" : undefined}
              style={{
                width: "100%",
                textAlign: "left",
                marginBottom: 10,
                borderRadius: "var(--radius-md)",
                border,
                background,
                color,
                padding: "16px 18px",
                cursor: answered ? "default" : "pointer",
                fontSize: 14,
                transition: "all 150ms var(--ease-color)",
                minHeight: 52,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-sm)",
                  background: showCorrectAnswer ? "var(--correct)" : isWrongSelected ? "var(--wrong)" : "var(--border-default)",
                  color: showCorrectAnswer || isWrongSelected ? "white" : "var(--text-secondary)",
                  fontWeight: 800,
                  fontSize: 12,
                  flexShrink: 0,
                  transition: "all 200ms var(--ease-color)",
                }}
              >
                {letters[optionIndex]}
              </span>
              <span style={{ flex: 1, lineHeight: 1.5 }}>{option}</span>
              {showCorrectAnswer && (
                <span aria-hidden="true" style={{ color: "var(--correct)", fontSize: 18 }}>✓</span>
              )}
              {isWrongSelected && (
                <span aria-hidden="true" style={{ color: "var(--wrong)", fontSize: 18 }}>✕</span>
              )}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div
          className="animate-fade-up"
          role="alert"
          style={{
            marginTop: 12,
            padding: "14px 18px",
            borderRadius: "var(--radius-md)",
            borderLeft: `4px solid ${selectedIndex === question.correctIndex ? "var(--correct)" : "var(--wrong)"}`,
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
            fontSize: 13,
            fontFamily: "var(--font-lora)",
            fontStyle: "italic",
            lineHeight: 1.6,
          }}
        >
          {question.explanation}
        </div>
      ) : null}
    </div>
  );
};

export default memo(QuizQuestionBase);
