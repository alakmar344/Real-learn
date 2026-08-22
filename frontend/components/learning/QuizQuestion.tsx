"use client";

import { useCallback, useRef, memo } from "react";
import { QuizQuestion as Question } from "@/types";
import MathText from "@/components/shared/MathText";
import { useLessonStore } from "@/store/lessonStore";
import { contentLangAttrs } from "@/lib/locale";
import { useTranslation } from "@/hooks/useTranslation";

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
  const { t } = useTranslation();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Quiz text is model-generated in the lesson language — mark it so screen
  // readers switch voices (WCAG 3.1.2). Surrounding UI chrome stays English.
  const lessonLanguage = useLessonStore((s) => s.lesson?.language);
  const langAttrs = contentLangAttrs(lessonLanguage);

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
      // Invisible UX: Quick key selection via numbers (1-9) or letters (A-Z)
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= optionCount) {
        e.preventDefault();
        onSelect(num - 1);
        return;
      }
      const charCode = e.key.toUpperCase().charCodeAt(0);
      if (e.key.length === 1 && charCode >= 65 && charCode < 65 + optionCount) {
        e.preventDefault();
        onSelect(charCode - 65);
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
        {t("quiz.questionMeta", { current: index + 1, total: totalQuestions })}
      </p>
      <p className="quiz-question__text" {...langAttrs}><MathText text={question.question} /></p>
      <div role="radiogroup" aria-label="Answer options" className="quiz-question__options" {...langAttrs}>
        {options.map((option, optionIndex) => {
          const isSelected = selectedIndex === optionIndex;
          const isCorrect = question.correctIndex === optionIndex;
          const showCorrectAnswer = answered && isCorrect;
          const isWrongSelected = answered && isSelected && !isCorrect;

          let optionClass = "quiz-question__option kinetic-card";
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
              <MathText text={option} />
            </button>
          );
        })}
      </div>
      {answered ? (
        <div
          className={`quiz-question__explanation ${explanationState} animate-fade-up`}
          role="alert"
          {...langAttrs}
        >
          <MathText text={question.explanation} />
        </div>
      ) : null}
    </div>
  );
};

export default memo(QuizQuestionBase);
