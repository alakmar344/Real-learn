"use client";

import { FormEvent, useEffect, useRef, useState, useLayoutEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import ExampleQuestions from "@/components/homepage/ExampleQuestions";
import MicButton from "@/components/shared/MicButton";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useMounted } from "@/hooks/useMounted";
import { warmupBackend } from "@/hooks/useLesson";
import { LessonMode, Language } from "@/types";

const MAX_QUESTION_LENGTH = 1000;

const URDU_PLACEHOLDER = "یہاں اپنا سوال لکھیں...";
const RTL_LANGUAGES: Language[] = ["Urdu"];

const MODES: { value: LessonMode; label: string; hint: string }[] = [
  { value: "fast", label: "Explain", hint: "Quick, simple explanation in 1 part" },
  { value: "explain", label: "Fast", hint: "Deep, detailed explanation in 3 parts" },
];

interface Props {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: () => void;
}

export default function QuestionInput({ question, setQuestion, onSubmit }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialQuestionRef = useRef(question);
  const [focused, setFocused] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");
  const { isSignedIn } = useAuth();
  const language = usePreferenceStore((s) => s.language);
  const persistedMode = usePreferenceStore((s) => s.mode);
  const setMode = usePreferenceStore((s) => s.setMode);
  const mounted = useMounted();
  const mode = mounted ? persistedMode : "fast";
  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];
  const charCount = question.length;
  const isRtl = RTL_LANGUAGES.includes(language);
  const activeIndex = MODES.findIndex((m) => m.value === mode);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [question]);

  // Restore draft question on mount
  useEffect(() => {
    if (!mounted) return;
    try {
      const savedDraft = sessionStorage.getItem("reallearn_draft_question");
      if (savedDraft && !initialQuestionRef.current) {
        setQuestion(savedDraft);
      }
      if (window.innerWidth >= 768 && textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch {
      // Best-effort
    }
  }, [mounted, setQuestion]);

  // Persist draft question
  useEffect(() => {
    if (!mounted) return;
    try {
      if (question.trim()) {
        sessionStorage.setItem("reallearn_draft_question", question);
      } else {
        sessionStorage.removeItem("reallearn_draft_question");
      }
    } catch {
      // Best-effort
    }
  }, [question, mounted]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn || !question.trim()) return;
    try {
      sessionStorage.removeItem("reallearn_draft_question");
    } catch {
      // ignore
    }
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits; Shift+Enter inserts a new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ask a question"
      className={`q-form${focused ? " q-form--focused" : ""}${isRtl ? " q-form--rtl" : ""}`}
    >
      <div className="q-form__body">
        <label htmlFor="question-input" className="sr-only">
          What do you want to understand today?
        </label>
        {isRtl && (
          <div className="q-form__urdu-badge" aria-hidden="true">
            <span className="q-form__urdu-badge-dot" />
            Urdu mode
          </div>
        )}
        <textarea
          id="question-input"
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => {
            warmupBackend();
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder={isRtl ? URDU_PLACEHOLDER : "Ask anything you want to understand..."}
          aria-label="Your question"
          dir={isRtl ? "rtl" : "ltr"}
          className={`q-form__textarea${isRtl ? " q-form__textarea--rtl" : ""}`}
        />
        {interimSpeech ? (
          <p aria-live="polite" className="q-form__listening">
            Listening — {interimSpeech}
          </p>
        ) : null}
      </div>

      <div className="q-form__bar">
        {/* Left: Mode toggle */}
        <div className="q-form__bar-left">
          <div role="radiogroup" aria-label="Answer mode" className="mode-glider">
            <span
              aria-hidden="true"
              className="mode-glider__pill"
              style={{
                width: `calc((100% - 8px) / ${MODES.length})`,
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

        {/* Right: Tools & Enter Button */}
        <div className="q-form__bar-right">
          <ExampleQuestions onPick={(q) => {
            setQuestion(q);
            textareaRef.current?.focus();
          }} />
          <MicButton
            language={language}
            onTranscript={(text) =>
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
              onClick={() => {
                setQuestion("");
                textareaRef.current?.focus();
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {isSignedIn ? (
            <button
              type="submit"
              disabled={!question.trim()}
              aria-label="Enter question"
              className="btn-primary q-form__enter-btn"
            >
              <span>Enter</span>
              <span className="q-form__enter-symbol" aria-hidden="true">↵</span>
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                aria-label="Sign in to Enter"
                className="btn-primary q-form__enter-btn"
              >
                <span>Sign in</span>
                <span className="q-form__enter-symbol" aria-hidden="true">↵</span>
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </form>
  );
}
