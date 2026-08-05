"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/shared/BrandMark";

// Swiss Industrial Brutalism hero + prompt card. Everything is driven by the
// component-scoped tokens in globals.css (--no-*) through Tailwind arbitrary
// values, so neither theme hardcodes a hex here.
const MAX_LEN = 1000;
const SAMPLE_PROMPT = "why can't we just print more money?";

export type NightOwlMode = "tldr" | "deep";

const MODES: { value: NightOwlMode; label: string }[] = [
  { value: "tldr", label: "TL;DR" },
  { value: "deep", label: "Deep Dive" },
];

interface Props {
  initialQuestion?: string;
  streak?: number;
  level?: number;
  onSubmit?: (question: string, mode: NightOwlMode) => void;
}

export default function NightOwlHero({
  initialQuestion = "",
  streak = 19,
  level = 14,
  onSubmit,
}: Props) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [theme, setTheme] = useState<"night" | "day">("night");
  const [question, setQuestion] = useState(initialQuestion);
  const [mode, setMode] = useState<NightOwlMode>("deep");

  const charCount = String(question.length).padStart(4, "0");
  const nearLimit = question.length >= MAX_LEN;

  const submit = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    if (onSubmit) {
      onSubmit(trimmed, mode);
      return;
    }
    router.push(`/learn?q=${encodeURIComponent(trimmed)}`);
  };

  const fillSample = () => {
    setQuestion(SAMPLE_PROMPT);
    textareaRef.current?.focus();
  };

  const clearQuestion = () => {
    setQuestion("");
    textareaRef.current?.focus();
  };

  return (
    <div className={`night-owl ${theme === "day" ? "night-owl--day" : "night-owl--night"} min-h-dvh w-full font-sans`}>
      {/* Navbar spec bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--no-border)] bg-[var(--no-bg)]">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="RealLearn home">
            <BrandMark className="h-4 w-4 text-[var(--no-text)]" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--no-text)]">
              RealLearn
            </span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => setTheme(theme === "day" ? "night" : "day")}
              aria-pressed={theme === "day"}
              className="border border-[var(--no-border)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--no-muted)] transition-colors duration-75 hover:text-[var(--no-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--no-text)]"
            >
              {theme === "day" ? "Day" : "Night"}
            </button>
            <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--no-muted)] sm:inline-flex">
              Streak
              <span className="text-[var(--no-text)]">{"// "}{streak}</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--no-muted)]">
              Lvl
              <span className="text-[var(--no-text)]">{"// "}{level}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        {/* Hero display */}
<p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--no-muted)]">
            {"// Ask one question. Learn everything."}
          </p>
        <h1 className="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-[var(--no-text)] sm:text-7xl lg:text-8xl">
          Night Owl
          <br />
          Mode,{" "}
          <span className="night-owl__outline">Pro</span>
        </h1>

        {/* Input card */}
        <section className="mt-10 border border-[var(--no-border)] bg-[var(--no-panel)]" aria-label="Ask a question">
          {/* Spec header */}
          <div className="flex items-center justify-between border-b border-[var(--no-border)] px-4 py-2.5 sm:px-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--no-muted)]">
              SYS_PROMPT
              <span className="text-[var(--no-text)]">{" // DIRECT"}</span>
            </span>
            <span
              aria-live="polite"
              className={`font-mono text-[10px] tabular-nums uppercase tracking-[0.22em] ${
                nearLimit ? "text-[var(--no-text)]" : "text-[var(--no-muted)]"
              }`}
            >
              {charCount} / 1000
            </span>
          </div>

          {/* Textarea */}
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              maxLength={MAX_LEN}
              rows={3}
              placeholder="ASK LITERALLY ANYTHING."
              aria-label="Your question"
              className="block w-full resize-none bg-transparent font-display text-xl font-bold leading-snug text-[var(--no-text)] placeholder-[var(--no-muted)] outline-none"
            />
          </div>

          {/* Mode toggles */}
          <div role="radiogroup" aria-label="Answer mode" className="flex gap-2 border-t border-[var(--no-border)] px-4 py-3 sm:px-5 sm:py-4">
            {MODES.map((opt) => {
              const active = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(opt.value)}
                  className={`flex-1 border px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] transition-colors duration-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--no-text)] ${
                    active
                      ? "border-transparent bg-[var(--no-invert-bg)] text-[var(--no-invert-text)]"
                      : "border-[var(--no-border)] bg-transparent text-[var(--no-muted)] hover:text-[var(--no-text)]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Sample prompt bar */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--no-border)] px-4 py-2.5 sm:px-5">
            <button
              type="button"
              onClick={fillSample}
              className="min-w-0 flex-1 truncate text-left font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--no-muted)] transition-colors duration-75 hover:text-[var(--no-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--no-text)]"
            >
              TRY: {SAMPLE_PROMPT}
            </button>
            <button
              type="button"
              onClick={clearQuestion}
              aria-label="Clear question"
              className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--no-muted)] transition-colors duration-75 hover:text-[var(--no-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--no-text)]"
            >
              [CLR]
            </button>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={submit}
            className="w-full border-t border-[var(--no-border)] bg-[var(--no-invert-bg)] px-4 py-4 font-display text-base font-extrabold uppercase tracking-[0.2em] text-[var(--no-invert-text)] transition-[transform,background-color] duration-75 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--no-invert-text)] active:scale-[0.99] sm:text-lg"
          >
            TEACH ME →
          </button>
        </section>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--no-muted)]">
          {"// 3-part lesson · quiz-gated · streak synced"}
        </p>
      </main>
    </div>
  );
}
