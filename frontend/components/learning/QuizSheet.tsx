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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quiz – Question ${current + 1} of ${totalQuestions}`}
      onClick={answered ? undefined : onClose}
      className="quiz-sheet"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--scrim, rgba(0,0,0,0.7))",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        zIndex: 90,
      }}
    >
      <div
        ref={sheetRef}
        className="animate-slide-bottom engraved identity-texture texture-noise"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
          padding: "0 32px 56px",
          boxShadow: "var(--shadow-lg), var(--glass-edge)",
        }}
      >
        {/* Top border accent */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "var(--accent)",
            borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
          }}
        />

        {/* Drag handle */}
        <div
          style={{
            width: 48,
            height: 5,
            borderRadius: 3,
            background: "var(--border-default)",
            margin: "14px auto 20px",
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz"
          style={{
            position: "absolute",
            top: 22,
            right: 32,
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "10px 16px",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 14,
            transition: "all 500ms var(--ease-spring)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-accent)";
            e.currentTarget.style.color = "var(--accent)";
            e.currentTarget.style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-subtle)";
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          ✕
        </button>

        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 20,
            background: "var(--accent)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Quick Check
        </h3>
        <p style={{ marginTop: 8, marginBottom: 20, fontSize: 13, color: "var(--text-secondary)" }}>
          {totalQuestions} question{totalQuestions === 1 ? "" : "s"} about what you just read
        </p>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", marginBottom: 20 }} />

        {shuffledHint ? (
          <div
            className="animate-fade-up"
            role="status"
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
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
                : score === perfectScore
                  ? "Unlock next part"
                  : "Read again"
            }
            style={{
              marginTop: 28,
              width: "100%",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
              border:
                score === perfectScore && current === lastQuestionIndex
                  ? "none"
                  : "1.5px solid var(--border-default)",
              background:
                score === perfectScore && current === lastQuestionIndex
                  ? "var(--accent)"
                  : "transparent",
              color:
                score === perfectScore && current === lastQuestionIndex
                  ? "white"
                  : "var(--text-primary)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 500ms var(--ease-spring)",
              boxShadow: "none",
              minHeight: 50,
            }}
            onMouseEnter={(e) => {
                if (score === perfectScore && current === lastQuestionIndex) {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--glass-edge)";
                } else {
                  e.currentTarget.style.borderColor = "var(--border-accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                if (score === perfectScore && current === lastQuestionIndex) {
                  e.currentTarget.style.boxShadow = "none";
                } else {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
          >
            {current < lastQuestionIndex
              ? "Next Question →"
              : score === perfectScore
                ? "Unlock Next Part →"
                : "Read Again"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
export default memo(QuizSheetBase);
