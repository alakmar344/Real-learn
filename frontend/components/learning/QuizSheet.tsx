"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { QuizQuestion as Question } from "@/types";
import QuizQuestion from "@/components/learning/QuizQuestion";
import { reshuffleQuestion } from "@/lib/quizShuffle";

interface Props {
  open: boolean;
  questions: Question[];
  onClose: () => void;
  onPass: (score: number) => void;
}

const QuizSheetBase = ({ open, questions, onClose, onPass }: Props) => {
  // Derive the quiz length from the actual questions instead of hardcoding 2.
  // The backend can legitimately deliver a salvaged single-question quiz
  // (e.g. when the model's output was truncated); with a hardcoded total of 2
  // such a quiz could never be passed and the learner would be stuck forever.
  const totalQuestions = Math.max(questions?.length ?? 0, 1);
  const lastQuestionIndex = totalQuestions - 1;
  const perfectScore = totalQuestions;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(
    Array.from({ length: totalQuestions }, () => null)
  );
  // Local working copy of the questions whose option order we control. On a
  // failed attempt the options are reshuffled so the learner has to find the
  // correct answer again.
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(questions ?? []);
  const [shuffledHint, setShuffledHint] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Reset to the original (unshuffled) questions whenever the source changes
  // (e.g. a new part) or the sheet is (re)opened.
  useEffect(() => {
    setQuizQuestions(questions ?? []);
    setCurrent(0);
    setAnswers(Array.from({ length: Math.max(questions?.length ?? 0, 1) }, () => null));
    setShuffledHint(false);
  }, [questions, open]);

  const currentQuestion = quizQuestions?.[current];
  const selected = answers[current];
  const answered = selected !== null;

  const score = useMemo(
    () =>
      answers.reduce(
        (acc: number, answer, i) =>
          acc + (answer === quizQuestions[i]?.correctIndex ? 1 : 0),
        0
      ),
    [answers, quizQuestions]
  );

  /* ── Focus trapping ── */
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const focusFirst = () => {
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length) focusable[0].focus();
    };
    /* Small delay so DOM renders first */
    const id = setTimeout(focusFirst, 80);

    return () => {
      clearTimeout(id);
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  const handleTabTrap = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleTabTrap);
    return () => document.removeEventListener("keydown", handleTabTrap);
  }, [open, handleTabTrap]);

  /* ── Escape to close ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !answered) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, answered, onClose]);

  if (!open || !currentQuestion) return null;

  const selectAnswer = (index: number) => {
    if (answered) return;
    setShuffledHint(false);
    const next = [...answers];
    next[current] = index;
    setAnswers(next);
  };

  const nextAction = () => {
    if (current < lastQuestionIndex) {
      setCurrent((prev) => prev + 1);
      return;
    }

    if (score === perfectScore) {
      onPass(score);
      setCurrent(0);
      setAnswers(Array.from({ length: totalQuestions }, () => null));
      setShuffledHint(false);
      return;
    }

    // Failed attempt → retake. Reshuffle every question's options so the
    // correct answer moves to a new position and must be found again.
    setQuizQuestions((prev) => prev.map(reshuffleQuestion));
    setCurrent(0);
    setAnswers(Array.from({ length: totalQuestions }, () => null));
    setShuffledHint(true);
  };

  const success = score === perfectScore && current === lastQuestionIndex;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quiz – Question ${current + 1} of ${totalQuestions}`}
      onClick={answered ? undefined : onClose}
      className="quiz-sheet"
    >
      <div
        ref={sheetRef}
        className="quiz-sheet__panel animate-slide-bottom engraved identity-texture texture-noise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top border accent */}
        <div className="quiz-sheet__accent" aria-hidden="true" />

        {/* Drag handle */}
        <div className="quiz-sheet__handle" />

        {/* Close button */}
        <button type="button" onClick={onClose} aria-label="Close quiz" className="quiz-sheet__close">
          ✕
        </button>

        <h3 className="quiz-sheet__title">Quick Check</h3>
        <p className="quiz-sheet__subtitle">
          {totalQuestions} question{totalQuestions === 1 ? "" : "s"} about what you just read
        </p>
        <div className="quiz-sheet__divider" />

        {shuffledHint ? (
          <div className="quiz-sheet__status animate-fade-up" role="status">
            Answers reshuffled — the correct one has moved. Find it again.
          </div>
        ) : null}

        <QuizQuestion
          question={currentQuestion}
          index={current}
          totalQuestions={quizQuestions.length}
          selectedIndex={selected}
          answered={answered}
          onSelect={selectAnswer}
        />

        {answered ? (
          <button
            type="button"
            onClick={nextAction}
            aria-label={
              current < lastQuestionIndex
                ? "Next question"
                : success
                  ? "Unlock next part"
                  : "Read again"
            }
            className={`quiz-sheet__action${success ? " is-success" : ""}`}
          >
            {current < lastQuestionIndex
              ? "Next Question →"
              : success
                ? "Unlock Next Part →"
                : "Read Again"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
export default memo(QuizSheetBase);
