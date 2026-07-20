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
  { value: "fast", label: "Fast", hint: "A quick, simple answer to get started" },
  { value: "explain", label: "Explain", hint: "A guided 3-part lesson with real-world context" },
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
  // mode is persisted; keep SSR default until mounted to avoid hydration mismatch.
  const mounted = useMounted();
  const mode = mounted ? persistedMode : "fast";
  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];
  const charCount = question.length;
  const nearLimit = charCount >= MAX_QUESTION_LENGTH * 0.9;
  const hintShow = showHint || focused;

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
    // Ctrl/Cmd + Enter submits; Enter alone adds a newline.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const activeIndex = MODES.findIndex((m) => m.value === mode);

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ask a question"
      className={`q-form liquid-sheen engraved identity-texture texture-noise${focused ? " q-form--focused" : ""}`}
    >
      <div className="q-form__body">
        <label htmlFor="question-input" style={{ display: "none" }}>
          What do you want to understand today?
        </label>
        <textarea
          id="question-input"
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => { setFocused(true); setShowHint(true); }}
          onBlur={() => { setFocused(false); window.setTimeout(() => setShowHint(false), 2000); }}
          onKeyDown={handleKeyDown}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Start with any question — even a basic one"
          aria-label="Your question"
          className="q-form__textarea"
        />
        {interimSpeech ? (
          <p aria-live="polite" className="q-form__listening">
            Listening — {interimSpeech}
          </p>
        ) : null}
        <div className="q-form__footer">
          <span className={`q-form__hint${hintShow ? " q-form__hint--show" : ""}`}>
            Press{" "}
            <kbd className="q-form__kbd">
              {/* Render neutral "Ctrl" until mounted; navigator.platform differs
                  between server and a Mac client (hydration mismatch). */}
              {mounted && /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"}
              +Enter
            </kbd>{" "}
            to submit
          </span>
          <span
            aria-live="polite"
            className={`q-form__count${nearLimit ? " q-form__count--near" : ""}`}
          >
            {charCount}/{MAX_QUESTION_LENGTH}
          </span>
        </div>
      </div>

      {/* Answer-mode toggle: Fast (1 direct part) vs Explain (3-part journey). */}
      <div className="q-form__modes">
        <div role="radiogroup" aria-label="Answer mode" className="mode-glider">
          <span
            aria-hidden="true"
            className="mode-glider__pill"
            style={{
              width: `calc((100% - 10px) / ${MODES.length})`,
              transform: `translateX(calc(${activeIndex} * 100%))`,
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
                className={`mode-glider__option${active ? " mode-glider__option--active" : ""}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <span className="q-form__mode-hint">{activeMode.hint}</span>
      </div>

      <div className="q-form__actions">
        <ExampleQuestions onPick={(q) => {
          setQuestion(q);
          textareaRef.current?.focus();
        }} />
        <div className="q-form__actions-right">
          <MicButton
            language={language}
            onTranscript={(text) =>
              // Voice transcripts bypass the textarea maxLength — clamp to the backend limit.
              setQuestion(
                (question.trim() ? `${question.trim()} ${text}` : text).slice(0, MAX_QUESTION_LENGTH)
              )
            }
            onInterim={setInterimSpeech}
          />
          {question.trim() && (
            <button
              type="button"
              aria-label="Clear question"
              title="Clear"
              className="btn-icon btn-icon--danger"
              onClick={() => { setQuestion(""); textareaRef.current?.focus(); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {isSignedIn ? (
            <button type="submit" disabled={!question.trim()} aria-label="Start learning" className="btn-primary">
              {mode === "fast" ? "Get a Quick Answer →" : "Start Guided Lesson →"}
            </button>
          ) : (
            <SignInButton mode="modal">
              <button type="button" aria-label="Sign in to start learning" className="btn-primary">
                Sign in to Learn →
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </form>
  );
}
