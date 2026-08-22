"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import { QuizQuestion as Question } from "@/types";
import QuizQuestion from "@/components/learning/QuizQuestion";
import { reshuffleQuestion, sanitizeQuestion } from "@/lib/quizShuffle";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Icon } from "@/components/shared/icons";

/** In-flight attempt for one part, held by the parent across close/reopen so
 * banked correct answers survive AND a failed first attempt can't be laundered
 * into a "perfect" one by reopening the sheet. Session-only, never persisted. */
export interface QuizAttemptState {
  questions: Question[];
  answers: Array<number | null>;
  firstAttemptScore: number | null;
}

interface Props {
  open: boolean;
  questions: Question[];
  partNumber?: number;
  initialState?: QuizAttemptState | null;
  onStateChange?: (state: QuizAttemptState) => void;
  onClose: () => void;
  onPass: (score: number) => void;
}

const QuizSheetBase = ({ open, questions, partNumber, initialState, onStateChange, onClose, onPass }: Props) => {
  // Derive the quiz length from the actual questions instead of hardcoding 2.
  // The backend can legitimately deliver a salvaged single-question quiz
  // (e.g. when the model's output was truncated); with a hardcoded total of 2
  // such a quiz could never be passed and the learner would be stuck forever.
  const totalQuestions = Math.max(questions?.length ?? 0, 1);
  const perfectScore = totalQuestions;

  // Resume a previous attempt only if it matches this quiz's shape (a stale
  // entry from another lesson would corrupt the score math).
  const resume =
    initialState && initialState.answers.length === totalQuestions ? initialState : null;

  const [current, setCurrent] = useState(() => {
    const firstUnanswered = resume ? resume.answers.findIndex((a) => a === null) : 0;
    return firstUnanswered >= 0 ? firstUnanswered : 0;
  });
  const [answers, setAnswers] = useState<Array<number | null>>(
    () => resume?.answers ?? Array.from({ length: totalQuestions }, () => null)
  );
  // Local working copy of the questions whose option order we control. On a
  // failed attempt the options are reshuffled so the learner has to find the
  // correct answer again.
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(
    () => resume?.questions ?? (questions ?? []).map(sanitizeQuestion)
  );
  // Resuming mid-retry (a full first pass already scored) → re-show the
  // "correct answers are saved" status.
  const [shuffledHint, setShuffledHint] = useState(
    () => resume !== null && resume.firstAttemptScore !== null && resume.answers.some((a) => a !== null)
  );
  // First-attempt score: the learner may optionally retry missed questions,
  // but "perfect" stats/achievements only mean something if they track
  // whether the learner aced the quiz on the FIRST try — capture that here
  // and report it through onPass.
  const [firstAttemptScore, setFirstAttemptScore] = useState<number | null>(
    () => resume?.firstAttemptScore ?? null
  );
  // Shared focus trap (hooks/useFocusTrap): moves focus to the first
  // focusable control on open, keeps Tab inside the panel, and restores
  // focus to the opener on close — same contract the old hand-rolled trap
  // provided, minus the 80ms setTimeout race.
  const sheetRef = useFocusTrap<HTMLDivElement>(open);
  const actionRef = useRef<HTMLButtonElement>(null);

  // Reset to the original (unshuffled) questions only when the SOURCE changes
  // (a different part) — not on reopen, which must keep the banked attempt.
  const sourceRef = useRef(questions);
  useEffect(() => {
    if (sourceRef.current === questions) return;
    sourceRef.current = questions;
    setQuizQuestions((questions ?? []).map(sanitizeQuestion));
    setCurrent(0);
    setAnswers(Array.from({ length: Math.max(questions?.length ?? 0, 1) }, () => null));
    setShuffledHint(false);
    setFirstAttemptScore(null);
  }, [questions]);

  // Mirror the attempt up to the parent so it survives the sheet unmounting.
  useEffect(() => {
    onStateChange?.({ questions: quizQuestions, answers, firstAttemptScore });
  }, [quizQuestions, answers, firstAttemptScore, onStateChange]);

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

  /* ── Keep focus inside the dialog as buttons disable/unmount ── */
  // Selecting an answer disables every option (including the focused one), so
  // the browser drops focus to <body> — past the tab trap. Move it to the
  // action button; when the next/retry question renders (action button gone),
  // return it to the first option. Skipped on mount so the existing
  // initial-focus behavior is untouched.
  const focusSyncArmedRef = useRef(false);
  useEffect(() => {
    if (!focusSyncArmedRef.current) {
      focusSyncArmedRef.current = true;
      return;
    }
    if (answered) {
      actionRef.current?.focus();
    } else {
      sheetRef.current
        ?.querySelector<HTMLElement>(".quiz-question__option")
        ?.focus();
    }
  }, [answered, current, sheetRef]);

  if (!open || !currentQuestion) return null;

  const selectAnswer = (index: number) => {
    if (answered) return;
    setShuffledHint(false);
    const next = [...answers];
    next[current] = index;
    setAnswers(next);
  };

  const nextQuestion = () => {
    // Move to the next question that still needs an answer (on a retry pass,
    // already-correct answers are kept, so "next" may skip over them).
    const nextUnanswered = answers.findIndex((a, i) => a === null && i !== current);
    if (nextUnanswered !== -1) setCurrent(nextUnanswered);
  };

  // The quiz is an OPTIONAL self-check, not a gate: ANY completed attempt
  // lets the learner continue. The score reported is the FIRST attempt's
  // score, so "perfect" stats still mean "aced on the first try".
  const finishQuiz = () => {
    const reportedScore = firstAttemptScore ?? score;
    onPass(reportedScore);
    setCurrent(0);
    setAnswers(Array.from({ length: totalQuestions }, () => null));
    setShuffledHint(false);
    setFirstAttemptScore(null);
  };

  // Optional mastery loop for learners who WANT it: correct answers are
  // BANKED, only missed questions come back (options reshuffled so the right
  // answer must be understood, not memorized by position).
  const retryMissed = () => {
    if (firstAttemptScore === null) setFirstAttemptScore(score);
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
  const allAnswered = !hasNextUnanswered && answered;
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

        {/* Close button */}
        <button type="button" onClick={onClose} aria-label="Close quiz" className="quiz-sheet__close">
          <Icon name="close" size={16} />
        </button>

        <h3 className="quiz-sheet__title">Quick check</h3>
        <p className="quiz-sheet__subtitle">
          {totalQuestions} quick question{totalQuestions === 1 ? "" : "s"} — just to make sure it stuck
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
                  const targetId = partNumber ? `part-${partNumber}` : null;
                  const el =
                    (targetId ? document.getElementById(targetId) : null) ||
                    document.querySelector(".part-card");
                  // Explicit behavior overrides the CSS reduced-motion rule
                  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
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
          <>
            <button
              ref={actionRef}
              type="button"
              onClick={allAnswered ? finishQuiz : nextQuestion}
              aria-label={hasNextUnanswered ? "Next question" : "Continue"}
              className={`quiz-sheet__action${success ? " is-success" : ""}`}
            >
              {hasNextUnanswered
                ? "Next question →"
                : success
                  ? "Perfect — continue →"
                  : "Continue →"}
            </button>
            {/* Missed some? Retrying is a choice, never a wall. */}
            {allAnswered && !success ? (
              <button
                type="button"
                onClick={retryMissed}
                className="btn-toggle"
                style={{ marginTop: "var(--space-sm, 8px)", width: "100%" }}
              >
                Or try the missed ones again
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
export default memo(QuizSheetBase);
