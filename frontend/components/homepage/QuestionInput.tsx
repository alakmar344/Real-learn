"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import ExampleQuestions from "@/components/homepage/ExampleQuestions";
import MicButton from "@/components/shared/MicButton";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useMounted } from "@/hooks/useMounted";
import { LessonMode } from "@/types";

const MAX_QUESTION_LENGTH = 1000;

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
  const [showHint, setShowHint] = useState(false);
  const { isSignedIn } = useAuth();
  const language = usePreferenceStore((s) => s.language);
  const persistedMode = usePreferenceStore((s) => s.mode);
  const setMode = usePreferenceStore((s) => s.setMode);
  // Hydration gate: `mode` is persisted, so the first client render must
  // match the SSR default until we're mounted.
  const mounted = useMounted();
  const mode = mounted ? persistedMode : "fast";
  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];
  const charCount = question.length;
  const nearLimit = charCount >= MAX_QUESTION_LENGTH * 0.9;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [question]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn) return;
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter submits; Enter alone adds a new line.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ask a question"
      className="liquid-sheen engraved identity-texture texture-noise"
      style={{
        marginTop: 32,
        maxWidth: 680,
        width: "100%",
        position: "relative",
        borderRadius: "var(--radius-2xl)",
        border: `1.5px solid ${focused ? "var(--border-accent)" : "var(--border-subtle)"}`,
        background: "var(--bg-card)",
        backdropFilter: "blur(var(--glass-blur-strong)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-strong)) saturate(var(--glass-saturate))",
        boxShadow: focused
          ? "var(--shadow-lg), 0 0 0 6px var(--accent-glow), var(--glass-edge)"
          : "var(--glass-shadow), var(--glass-edge)",
        transition: "all 500ms var(--ease-color)",
      }}
    >
      <div style={{ padding: "24px 28px 14px" }}>
        <label htmlFor="question-input" style={{ display: "none" }}>
          What do you want to understand today?
        </label>
        <textarea
          id="question-input"
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setShowHint(true);
          }}
          onBlur={() => {
            setFocused(false);
            window.setTimeout(() => setShowHint(false), 2000);
          }}
          onKeyDown={handleKeyDown}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Start with any question — even a basic one"
          aria-label="Your question"
          style={{
            width: "100%",
            minHeight: 64,
            maxHeight: 180,
            resize: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 17,
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            minHeight: 20,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              opacity: showHint || focused ? 1 : 0,
              transform: showHint || focused ? "translateY(0)" : "translateY(4px)",
              transition: "opacity 200ms ease, transform 200ms ease",
            }}
          >
            Press{" "}
            <kbd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "2px 5px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              {typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
                ? "⌘"
                : "Ctrl"}
              +Enter
            </kbd>{" "}
            to submit
          </span>
          <span
            aria-live="polite"
            style={{
              fontSize: 12,
              fontVariantNumeric: "tabular-nums",
              color: nearLimit ? "var(--wrong)" : "var(--text-tertiary)",
              fontWeight: nearLimit ? 600 : 400,
              transition: "color 200ms ease",
            }}
          >
            {charCount}/{MAX_QUESTION_LENGTH}
          </span>
        </div>
      </div>
      {/* ── Answer-mode toggle: Fast (1 direct part) vs Explain (3-part journey).
          A sliding "glider" — the gold pill glides between options on a springy
          transform so switching modes (especially to Fast) feels like a smooth
          physical switch, not a snap. ── */}
      <div
        style={{
          padding: "0 20px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          role="radiogroup"
          aria-label="Answer mode"
          className="mode-glider"
          style={{
            position: "relative",
            display: "inline-flex",
            padding: 5,
            gap: 0,
            borderRadius: 999,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
          }}
        >
          {/* The gliding pill — translates to sit under the active option. */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 5,
              bottom: 5,
              left: 5,
              width: `calc((100% - 10px) / ${MODES.length})`,
              borderRadius: 999,
              background: "var(--accent-gradient)",
              boxShadow: "var(--shadow-glow-accent)",
              transition: "transform 420ms var(--ease-spring)",
              transform: `translateX(calc(${MODES.findIndex((m) => m.value === mode)} * 100%))`,
              willChange: "transform",
            }}
          />
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
                  position: "relative",
                  zIndex: 1,
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  minHeight: 40,
                  minWidth: 104,
                  textAlign: "center",
                  color: active ? "var(--on-accent)" : "var(--text-secondary)",
                  background: "transparent",
                  transition: "color 320ms var(--ease-color)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500 }}>{activeMode.hint}</span>
      </div>
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <ExampleQuestions onPick={(q) => {
          setQuestion(q);
          textareaRef.current?.focus();
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MicButton
            language={language}
            onTranscript={(text) =>
              setQuestion(question.trim() ? `${question.trim()} ${text}` : text)
            }
            onInterim={setInterimSpeech}
          />
          {question.trim() && (
            <button
              type="button"
              aria-label="Clear question"
              title="Clear"
              onClick={() => {
                setQuestion("");
                textareaRef.current?.focus();
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: "1px solid var(--border-default)",
                background: "transparent",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                transition: "all 400ms var(--ease-spring)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--wrong)";
                e.currentTarget.style.color = "var(--wrong)";
                e.currentTarget.style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.color = "var(--text-tertiary)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {isSignedIn ? (
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Start learning"
            style={{
              border: "none",
              borderRadius: "var(--radius-lg)",
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--on-accent)",
              background: question.trim() ? "var(--accent)" : "var(--border-default)",
              cursor: question.trim() ? "pointer" : "not-allowed",
              transition: "all 500ms var(--ease-spring)",
              minHeight: 50,
              boxShadow: question.trim() ? "var(--shadow-glow-accent)" : "none",
            }}
            onMouseEnter={(e) => {
              if (question.trim()) {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--glass-edge)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = question.trim() ? "var(--shadow-glow-accent)" : "none";
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
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--on-accent)",
                background: "var(--accent)",
                cursor: "pointer",
                transition: "all 500ms var(--ease-spring)",
                minHeight: 50,
                boxShadow: "var(--shadow-glow-accent)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--glass-edge)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "var(--shadow-glow-accent)";
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
