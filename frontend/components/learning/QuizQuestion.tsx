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

// Derive the badge letter instead of indexing a fixed A–D table: model-
// generated questions can have more than four options, which produced an
// empty badge and an "Option undefined" accessible name for the extras.
const letterFor = (index: number) => String.fromCharCode(65 + index);

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

  const explanationState = selectedIndex === question.correctIndex ? "is-correct" : "is-wrong";

  return (
    <div role="group" aria-label={`Question ${index + 1} of ${totalQuestions}`} className="quiz-question">
      <p className="quiz-question__meta">
        Question {index + 1} of {totalQuestions}
      </p>
      <p className="quiz-question__text">{question.question}</p>
      <div role="radiogroup" aria-label="Answer options" className="quiz-question__options">
        {options.map((option, optionIndex) => {
          const isSelected = selectedIndex === optionIndex;
          const isCorrect = question.correctIndex === optionIndex;
          const showCorrectAnswer = answered && isCorrect;
          const isWrongSelected = answered && isSelected && !isCorrect;

          let optionClass = "quiz-question__option";
          if (showCorrectAnswer) optionClass += " is-correct";
          if (isWrongSelected) optionClass += " is-wrong";
          if (isWrongSelected) optionClass += " animate-shake";
          if (showCorrectAnswer && isSelected) optionClass += " animate-correct-pulse";

          let badgeClass = "quiz-question__badge";
          if (showCorrectAnswer) badgeClass += " is-correct";
          else if (isWrongSelected) badgeClass += " is-wrong";
          else badgeClass += " is-default";

          return (
            <button
              // Index-keyed: options are model-generated and can contain
              // duplicate text, which broke reconciliation after reshuffles.
              key={`${optionIndex}-${option}`}
              ref={(el) => { optionRefs.current[optionIndex] = el; }}
              type="button"
              role="radio"
              aria-checked={isSelected ?? false}
              aria-label={`Option ${letterFor(optionIndex)}: ${option}${answered && isCorrect ? " – Correct answer" : ""}${answered && isWrongSelected ? " – Incorrect" : ""}`}
              disabled={answered}
              onClick={() => onSelect(optionIndex)}
              onKeyDown={(e) => handleKeyDown(e, optionIndex)}
              className={optionClass}
            >
              <span className={badgeClass}>{letterFor(optionIndex)}</span>
              {option}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div
          className={`quiz-question__explanation ${explanationState} animate-fade-up`}
          role="alert"
        >
          {question.explanation}
        </div>
      ) : null}
    </div>
  );
};

export default memo(QuizQuestionBase);
