"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { QuizQuestion as Question } from "@/types";
import QuizQuestion from "@/components/learning/QuizQuestion";
import { reshuffleQuestion, sanitizeQuestion } from "@/lib/quizShuffle";
import { Icon } from "@/components/shared/icons";

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
  const perfectScore = totalQuestions;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(
    Array.from({ length: totalQuestions }, () => null)
  );
  // Local working copy of the questions whose option order we control. On a
  // failed attempt the options are reshuffled so the learner has to find the
  // correct answer again.
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(
    (questions ?? []).map(sanitizeQuestion)
  );
  const [shuffledHint, setShuffledHint] = useState(false);
  // First-attempt score: passing requires a perfect run, so the score at the
  // moment of passing is ALWAYS perfect. "Perfect" stats/achievements only
  // mean something if they track whether the learner aced the quiz on the
  // FIRST try — capture that here and report it through onPass.
  const [firstAttemptScore, setFirstAttemptScore] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Reset to the original (unshuffled) questions whenever the source changes
  // (e.g. a new part) or the sheet is (re)opened.
  useEffect(() => {
    setQuizQuestions((questions ?? []).map(sanitizeQuestion));
    setCurrent(0);
    setAnswers(Array.from({ length: Math.max(questions?.length ?? 0, 1) }, () => null));
    setShuffledHint(false);
    setFirstAttemptScore(null);
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
  // Escape ALWAYS closes (standard dialog behavior — the × button already
  // allows it at any time, so gating Escape on !answered only trapped
  // keyboard users after they picked an answer). Backdrop clicks stay
  // guarded once an answer is selected so a stray tap can't dismiss the
  // feedback the learner is reading.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !currentQuestion) return null;

  const selectAnswer = (index: number) => {
    if (answered) return;
    setShuffledHint(false);
    const next = [...answers];
    next[current] = index;
    setAnswers(next);
  };

  const nextAction = () => {
    // Move to the next question that still needs an answer (on a retry pass,
    // already-correct answers are kept, so "next" may skip over them).
    const nextUnanswered = answers.findIndex((a, i) => a === null && i !== current);
    if (nextUnanswered !== -1) {
      setCurrent(nextUnanswered);
      return;
    }

    // Record the very first completed attempt's score (later attempts don't
    // overwrite it) — this is what onPass reports so "perfect" means "aced
    // on the first try", not "eventually got everything right".
    const reportedScore = firstAttemptScore ?? score;
    if (firstAttemptScore === null) setFirstAttemptScore(score);

    if (score === perfectScore) {
      onPass(reportedScore);
      setCurrent(0);
      setAnswers(Array.from({ length: totalQuestions }, () => null));
      setShuffledHint(false);
      setFirstAttemptScore(null);
      return;
    }

    // Missed some → mastery still requires every question right, but correct
    // answers are BANKED. Only the missed questions come back (with their
    // options reshuffled so the right answer must be understood, not
    // memorized by position). This keeps the 100% gate without the punishing
    // "one slip restarts everything" loop that traps struggling learners.
    const missed = quizQuestions
      .map((q, i) => (answers[i] === q.correctIndex ? -1 : i))
      .filter((i) => i !== -1);
    setQuizQuestions((prev) =>
      prev.map((q, i) => (missed.includes(i) ? reshuffleQuestion(q) : q))
    );
    setAnswers((prev) => prev.map((a, i) => (missed.includes(i) ? null : a)));
    setCurrent(missed[0] ?? 0);
    setShuffledHint(true);
  };

  const remaining = answers.filter((a) => a === null).length;
  const hasNextUnanswered = answers.some((a, i) => a === null && i !== current);
  const success = score === perfectScore && !hasNextUnanswered;

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
        className="quiz-sheet__panel animate-slide-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top border accent */}
        <div className="quiz-sheet__accent" aria-hidden="true" />

        {/* Drag handle */}
        <div className="quiz-sheet__handle" />

        {/* Close button */}
        <button type="button" onClick={onClose} aria-label="Close quiz" className="quiz-sheet__close">
          <Icon name="close" size={16} />
        </button>

        <h3 className="quiz-sheet__title">Quick Check</h3>
        <p className="quiz-sheet__subtitle">
          {totalQuestions} question{totalQuestions === 1 ? "" : "s"} about what you just read
        </p>

        {/* Progress dots — show where you are in the quiz at a glance. */}
        <div className="quiz-progress" aria-hidden="true">
          {quizQuestions.map((_, i) => {
            const state =
              i === current ? "current" : answers[i] !== null ? "answered" : "pending";
            return (
              <span
                key={i}
                className={`quiz-progress__dot quiz-progress__dot--${state}`}
              />
            );
          })}
        </div>

        <div className="quiz-sheet__divider" />

        {shuffledHint ? (
          <>
            <div className="quiz-sheet__status animate-fade-up" role="status">
              {remaining === 1
                ? "Almost there — one question to revisit. Your correct answers are saved."
                : `Almost there — ${remaining} questions to revisit. Your correct answers are saved.`}
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                // Scroll to the relevant part card after a short delay
                setTimeout(() => {
                  const el = document.querySelector(".part-card");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 300);
              }}
              className="quiz-sheet__reread"
            >
              Re-read the section before retrying
            </button>
          </>
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
              hasNextUnanswered
                ? "Next question"
                : success
                  ? "Unlock next part"
                  : "Retry missed questions"
            }
            className={`quiz-sheet__action${success ? " is-success" : ""}`}
          >
            {hasNextUnanswered
              ? "Next Question →"
              : success
                ? "Unlock Next Part →"
                : "Retry the Missed Ones →"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
export default memo(QuizSheetBase);
