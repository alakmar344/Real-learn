"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import ExampleQuestions from "@/components/homepage/ExampleQuestions";
import MicButton from "@/components/shared/MicButton";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useMounted } from "@/hooks/useMounted";
import { LessonMode } from "@/types";

const MODES: { value: LessonMode; label: string; hint: string }[] = [
  {
    value: "fast",
    label: "Fast",
    hint: "A quick, simple answer to get started",
  },
  {
    value: "explain",
    label: "Explain",
    hint: "A guided 3-part lesson with real-world context",
  },
];

interface Props {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: () => void;
}

export default function QuestionInput({ question, setQuestion, onSubmit }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");
  const { isSignedIn } = useAuth();
  const language = usePreferenceStore((s) => s.language);
  const persistedMode = usePreferenceStore((s) => s.mode);
  const setMode = usePreferenceStore((s) => s.setMode);
  // Hydration gate: `mode` is persisted, so the first client render must
  // match the SSR default until we're mounted.
  const mounted = useMounted();
  const mode = mounted ? persistedMode : "fast";
  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [question]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ask a question"
      style={{
        marginTop: 48,
        maxWidth: 640,
        width: "100%",
        borderRadius: "var(--radius-2xl)",
        border: `2px solid ${focused ? "var(--accent)" : "var(--border-subtle)"}`,
        background: "var(--bg-card)",
        boxShadow: focused ? "var(--shadow-md)" : "var(--shadow-lg)",
        transition: "all 300ms var(--ease-color)",
      }}
    >
      <div style={{ padding: "20px 24px" }}>
        <label htmlFor="question-input" style={{ display: "none" }}>
          What do you want to understand today?
        </label>
        <textarea
          id="question-input"
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={1000}
          placeholder="Start with any question — even a basic one"
          aria-label="Your question"
          style={{
            width: "100%",
            minHeight: 56,
            maxHeight: 160,
            resize: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 16,
            lineHeight: 1.6,
            fontFamily: "var(--font-lora)",
          }}
        />
        {interimSpeech ? (
          <p
            aria-live="polite"
            style={{ margin: "6px 0 0", fontSize: 13, color: "var(--accent)", fontStyle: "italic" }}
          >
            Listening — {interimSpeech}
          </p>
        ) : null}
      </div>
      {/* ── Answer-mode toggle: Fast (1 direct part) vs Explain (3-part journey) ── */}
      <div
        style={{
          padding: "0 16px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div
          role="radiogroup"
          aria-label="Answer mode"
          style={{
            display: "inline-flex",
            padding: 4,
            gap: 3,
            borderRadius: 999,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
          }}
        >
          {MODES.map((opt) => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                title={opt.hint}
                onClick={() => setMode(opt.value)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  minHeight: 36,
                  color: active ? "var(--on-accent)" : "var(--text-secondary)",
                  background: active ? "var(--accent)" : "transparent",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  transition: "all 200ms var(--ease-color)",
                  transform: active ? "scale(1.02)" : "scale(1)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{activeMode.hint}</span>
      </div>
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <ExampleQuestions />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MicButton
            language={language}
            onTranscript={(text) =>
              setQuestion(question.trim() ? `${question.trim()} ${text}` : text)
            }
            onInterim={setInterimSpeech}
          />
          {isSignedIn ? (
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Start learning"
            style={{
              border: "none",
              borderRadius: "var(--radius-lg)",
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--on-accent)",
              background: question.trim() ? "var(--accent)" : "var(--border-default)",
              cursor: question.trim() ? "pointer" : "not-allowed",
              transition: "all 300ms var(--ease-color)",
              minHeight: 48,
              boxShadow: question.trim() ? "var(--shadow-sm)" : "var(--shadow-sm)",
              transform: question.trim() ? "scale(1)" : "scale(1)",
            }}
            onMouseEnter={(e) => {
              if (question.trim()) {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = question.trim() ? "var(--shadow-sm)" : "var(--shadow-sm)";
            }}
          >
            {mode === "fast" ? "Get a Quick Answer →" : "Start Guided Lesson →"}
          </button>
        ) : (
          <SignInButton mode="modal">
            <button
              type="button"
              aria-label="Sign in to start learning"
              style={{
                border: "none",
                borderRadius: "var(--radius-lg)",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--on-accent)",
                background: "var(--accent)",
                cursor: "pointer",
                transition: "all 300ms var(--ease-color)",
                minHeight: 48,
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              Sign in to Learn →
            </button>
          </SignInButton>
          )}
        </div>
      </div>
    </form>
  );
}
