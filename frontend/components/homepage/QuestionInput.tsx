"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import ExampleQuestions from "@/components/homepage/ExampleQuestions";
import MicButton from "@/components/shared/MicButton";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useMounted } from "@/hooks/useMounted";
import { LessonMode } from "@/types";

const MODES: { value: LessonMode; icon: string; label: string; hint: string }[] = [
  {
    value: "fast",
    icon: "⚡",
    label: "Fast",
    hint: "A quick, simple answer to get started",
  },
  {
    value: "explain",
    icon: "📚",
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
        borderRadius: "var(--radius-lg)",
        border: `1.5px solid ${focused ? "var(--accent)" : "var(--border-default)"}`,
        background: "var(--bg-card)",
        boxShadow: "var(--shadow-lg)",
        transition: "border-color 200ms var(--ease-color)",
      }}
    >
      <div style={{ padding: "20px 24px" }}>
        <label htmlFor="question-input" style={{ display: "none" }}>
          What would you like to learn about today?
        </label>
        <textarea
          id="question-input"
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={1000}
          placeholder="What would you like to learn about today?"
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
            style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic" }}
          >
            🎙 {interimSpeech}
          </p>
        ) : null}
      </div>
      {/* ── Answer-mode toggle: Fast (1 direct part) vs Explain (3-part journey) ── */}
      <div
        style={{
          padding: "0 16px 12px",
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
            padding: 3,
            gap: 2,
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
                  padding: "6px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  minHeight: 32,
                  color: active ? "var(--on-accent)" : "var(--text-secondary)",
                  background: active ? "var(--accent-gradient)" : "transparent",
                  boxShadow: active ? "var(--shadow-glow-accent)" : "none",
                  transition: "all 200ms var(--ease-color)",
                }}
              >
                <span aria-hidden="true" style={{ marginRight: 6 }}>{opt.icon}</span>
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
          padding: "12px 16px",
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
              borderRadius: "var(--radius-md)",
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--on-accent)",
              background: question.trim() ? "var(--accent)" : "var(--border-default)",
              cursor: question.trim() ? "pointer" : "not-allowed",
              transition: "all 200ms var(--ease-color)",
              minHeight: 44,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {mode === "fast" ? "Get Quick Help ⚡" : "Start Guided Lesson →"}
          </button>
        ) : (
          <SignInButton mode="modal">
            <button
              type="button"
              aria-label="Sign in to start learning"
              style={{
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--on-accent)",
                background: "var(--accent)",
                cursor: "pointer",
                transition: "all 200ms var(--ease-color)",
                minHeight: 44,
                boxShadow: "var(--shadow-sm)",
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
