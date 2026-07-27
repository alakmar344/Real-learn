"use client";

import { FormEvent, useEffect, useRef, useState, useLayoutEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import ExampleQuestions from "@/components/homepage/ExampleQuestions";
import MicButton from "@/components/shared/MicButton";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useMounted } from "@/hooks/useMounted";
import { LessonMode } from "@/types";

const MAX_QUESTION_LENGTH = 1000;

const MODES: { value: LessonMode; label: string; hint: string }[] = [
  { value: "fast", label: "⚡ Quick", hint: "Straight answer, zero fluff" },
  { value: "explain", label: "🧠 Deep Dive", hint: "Full 3-part journey — quizzes included" },
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
  const [glowIntensity, setGlowIntensity] = useState(0);
  const { isSignedIn } = useAuth();
  const language = usePreferenceStore((s) => s.language);
  const persistedMode = usePreferenceStore((s) => s.mode);
  const setMode = usePreferenceStore((s) => s.setMode);
  const mounted = useMounted();
  const mode = mounted ? persistedMode : "fast";
  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];
  const charCount = question.length;
  const nearLimit = charCount >= MAX_QUESTION_LENGTH * 0.9;
  const hintShow = showHint || focused;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [question]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const savedDraft = sessionStorage.getItem("reallearn_draft_question");
      if (savedDraft && !question) {
        setQuestion(savedDraft);
      }
      if (window.innerWidth >= 768 && textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch {
      // Best-effort storage
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      if (question.trim()) {
        sessionStorage.setItem("reallearn_draft_question", question);
      } else {
        sessionStorage.removeItem("reallearn_draft_question");
      }
    } catch {
      // Best-effort storage
    }
  }, [question, mounted]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!isSignedIn) return;
    try {
      sessionStorage.removeItem("reallearn_draft_question");
    } catch {
      // ignore
    }
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      className={`q-form engraved texture-noise${focused ? " q-form--focused" : ""} electric-card`}
      style={{
        "--glow-intensity": glowIntensity,
        transition: "box-shadow 300ms var(--ease-spring), border-color 300ms var(--ease-color), transform 300ms var(--ease-spring)",
      } as React.CSSProperties}
      onMouseEnter={() => setGlowIntensity(1)}
      onMouseLeave={() => setGlowIntensity(0)}
    >
      <div className="q-form__body">
        <label htmlFor="question-input" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
          What do you want to understand today?
        </label>
        <div className="q-form__textarea-wrapper" style={{ position: "relative" }}>
          <textarea
            id="question-input"
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onFocus={() => { setFocused(true); setShowHint(true); }}
            onBlur={() => { setFocused(false); window.setTimeout(() => setShowHint(false), 2000); }}
            onKeyDown={handleKeyDown}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Ask literally anything — no dumb questions here 🤷‍♂️"
            aria-label="Your question"
            className="q-form__textarea"
            style={{
              background: focused ? "var(--bg-surface)" : "var(--bg-card)",
              transition: "background 200ms var(--ease-color), box-shadow 200ms var(--ease-color)",
            }}
          />
          {focused && (
            <div 
              className="q-form__focus-glow" 
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: -2,
                borderRadius: "inherit",
                background: "var(--accent-gradient)",
                opacity: 0.15,
                filter: "blur(16px)",
                pointerEvents: "none",
                zIndex: -1,
                animation: "glowPulse 2s ease-in-out infinite",
              }}
            />
          )}
          {interimSpeech ? (
            <p aria-live="polite" className="q-form__listening" style={{ animation: "slideUpFade 300ms var(--ease-reveal)" }}>
              <span className="typing-cursor" aria-hidden="true"></span>
              Listening — {interimSpeech}
            </p>
          ) : null}
        </div>
        <div className="q-form__footer">
          <span className={`q-form__hint${hintShow ? " q-form__hint--show" : ""}`} style={{ animation: "slideUpFade 300ms var(--ease-reveal)" }}>
            Press{" "}
            <kbd className="q-form__kbd" style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--border-glow)" }}>
              {mounted && /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"}
              +Enter
            </kbd>{" "}
            to submit
          </span>
          <span
            aria-live="polite"
            className={`q-form__count${nearLimit ? " q-form__count--near" : ""}`}
            style={{ 
              color: nearLimit ? "var(--wrong)" : "var(--text-tertiary)",
              transition: "color 200ms var(--ease-color)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {charCount}/{MAX_QUESTION_LENGTH}
          </span>
        </div>
      </div>

      {/* Answer-mode toggle: Quick (1 direct part) vs Deep Dive (3-part journey). */}
      <div className="q-form__modes" style={{ animation: "slideUpFade 400ms var(--ease-reveal) 100ms both" }}>
        <div role="radiogroup" aria-label="Answer mode" className="mode-glider">
          <span
            aria-hidden="true"
            className="mode-glider__pill"
            style={{
              width: `calc((100% - 10px) / ${MODES.length})`,
              transform: `translateX(calc(${activeIndex} * 100%))`,
              transition: "transform 300ms var(--ease-spring)",
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
                style={{
                  transition: "all 250ms var(--ease-spring)",
                  transform: active ? "scale(1.02)" : "scale(1)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <span className="q-form__mode-hint" style={{ 
          color: "var(--accent)", 
          fontWeight: 600,
          animation: "slideUpFade 300ms var(--ease-reveal) 200ms both",
        }}>
          {activeMode.hint}
        </span>
      </div>

      <div className="q-form__actions" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", animation: "slideUpFade 400ms var(--ease-reveal) 300ms both" }}>
        <ExampleQuestions onPick={(q) => {
          setQuestion(q);
          textareaRef.current?.focus();
        }} />
        <div className="q-form__actions-right" style={{ display: "flex", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
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
              className="btn-icon btn-icon--danger electric-card"
              onClick={() => { setQuestion(""); textareaRef.current?.focus(); }}
              style={{ transition: "all 200ms var(--ease-spring)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {isSignedIn ? (
            <button type="submit" disabled={!question.trim()} aria-label="Start learning" className="btn-primary btn-cyber">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {mode === "fast" ? "⚡ Get Quick Answer →" : "🧠 Start Deep Dive →"}
              </span>
            </button>
          ) : (
            <SignInButton mode="modal">
              <button type="button" aria-label="Sign in to start learning" className="btn-primary btn-cyber">
                Sign in to Learn →
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </form>
  );
}

