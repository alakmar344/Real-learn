"use client";

import { useCallback, useRef } from "react";
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

export default function QuizQuestion({ question, index, totalQuestions, selectedIndex, answered, onSelect }: Props) {
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
    <div role="group" aria-label={`Question ${index + 1} of ${totalQuestions}`}>
      <p style={{ margin: 0, marginBottom: 8, fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>
        Question {index + 1} of {totalQuestions}
      </p>
      <p style={{ margin: 0, marginBottom: 16, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
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
            // Derive from the theme token — the old hardcoded light-palette
            // green was nearly invisible against dark-theme backgrounds.
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
              // Index-keyed: options are model-generated and can contain
              // duplicate text, which broke reconciliation after reshuffles.
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
                marginBottom: 8,
                borderRadius: "var(--radius-md)",
                border,
                background,
                color,
                padding: "14px 16px",
                cursor: answered ? "default" : "pointer",
                fontSize: 14,
                transition: "all 150ms var(--ease-color)",
                minHeight: 44, /* Touch-friendly target */
              }}
            >
              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 24,
                  height: 24,
                  marginRight: 12,
                  borderRadius: "var(--radius-sm)",
                  background: showCorrectAnswer ? "var(--correct)" : isWrongSelected ? "var(--wrong)" : "var(--border-default)",
                  color: showCorrectAnswer || isWrongSelected ? "white" : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {letters[optionIndex]}
              </span>
              {option}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div
          className="animate-fade-up"
          role="alert"
          style={{
            marginTop: 8,
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            borderLeft: `3px solid ${selectedIndex === question.correctIndex ? "var(--correct)" : "var(--wrong)"}`,
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
            fontSize: 13,
            fontFamily: "var(--font-lora)",
            fontStyle: "italic",
          }}
        >
          {question.explanation}
        </div>
      ) : null}
    </div>
  );
}
