"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuizQuestion as Question } from "@/types";
import QuizQuestion from "@/components/learning/QuizQuestion";

const TOTAL_QUESTIONS = 2;
const LAST_QUESTION_INDEX = TOTAL_QUESTIONS - 1;
const PERFECT_SCORE = TOTAL_QUESTIONS;

/** Fisher-Yates shuffle of an index array. */
function shuffledIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Return a copy of the question with its options re-ordered. The correct answer
 * is guaranteed to land in a DIFFERENT position than it currently occupies (when
 * there is more than one option), so on a retake the learner must find it again.
 */
function reshuffleQuestion(question: Question): Question {
  const options = question.options ?? [];
  if (options.length <= 1) return question;

  const currentCorrect = question.correctIndex;
  let order = shuffledIndices(options.length);
  // Re-roll until the correct answer moves to a new slot (bounded for safety).
  for (let attempt = 0; attempt < 16 && order.indexOf(currentCorrect) === currentCorrect; attempt += 1) {
    order = shuffledIndices(options.length);
  }

  return {
    ...question,
    options: order.map((i) => options[i]),
    correctIndex: order.indexOf(currentCorrect),
  };
}

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
    setAnswers(Array.from({ length: TOTAL_QUESTIONS }, () => null));
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
    if (current < LAST_QUESTION_INDEX) {
      setCurrent((prev) => prev + 1);
      return;
    }

    if (score === PERFECT_SCORE) {
      onPass(score);
      setCurrent(0);
      setAnswers(Array.from({ length: TOTAL_QUESTIONS }, () => null));
      setShuffledHint(false);
      return;
    }

    // Failed attempt → retake. Reshuffle every question's options so the
    // correct answer moves to a new position and must be found again.
    setQuizQuestions((prev) => prev.map(reshuffleQuestion));
    setCurrent(0);
    setAnswers(Array.from({ length: TOTAL_QUESTIONS }, () => null));
    setShuffledHint(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quiz – Question ${current + 1} of ${TOTAL_QUESTIONS}`}
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
        ref={sheetRef}
        className="animate-slide-bottom"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--bg-card)",
          borderTop: "2px solid var(--accent)",
          borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
          padding: "0 24px 40px",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-default)", margin: "12px auto 20px" }} />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz"
          style={{
            position: "absolute",
            top: 16,
            right: 24,
            background: "transparent",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "4px 10px",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ✕
        </button>

        <h3 style={{ margin: 0, fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 18 }}>
          Quick Check
        </h3>
        <p style={{ marginTop: 6, marginBottom: 16, fontSize: 13, color: "var(--text-secondary)" }}>
          {TOTAL_QUESTIONS} questions about what you just read
        </p>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", marginBottom: 16 }} />

        {shuffledHint ? (
          <div
            className="animate-fade-up"
            role="status"
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-primary)",
              color: "var(--text-secondary)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span aria-hidden="true">🔀</span>
            Answers reshuffled — the correct one has moved. Find it again!
          </div>
        ) : null}

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
            aria-label={
              current < LAST_QUESTION_INDEX
                ? "Next question"
                : score === PERFECT_SCORE
                  ? "Unlock next part"
                  : "Read again"
            }
            style={{
              marginTop: 18,
              width: "100%",
              borderRadius: "var(--radius-md)",
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
              transition: "background 200ms var(--ease-color)",
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
