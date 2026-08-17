"use client";

import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { Icon } from "@/components/shared/icons";
import MathText from "@/components/shared/MathText";

// Each step "completes" once the displayed progress passes its threshold.
// The final "quiz" step sits at 95 — past the auto-progress ceiling — so it
// only lights up on real backend progress or the actual reveal, never from
// the local timer pretending.
const EXPLAIN_STEPS = [
  { label: "Understanding your question", at: 5 },
  { label: "Researching real-world context", at: 15 },
  { label: "Writing the foundation", at: 40 },
  { label: "Explaining how it works", at: 62 },
  { label: "Connecting it to the real world", at: 85 },
  { label: "Crafting quiz questions", at: 95 },
];

// Fast mode generates a single direct answer + quiz — no 3-part journey.
const FAST_STEPS = [
  { label: "Understanding your question", at: 5 },
  { label: "Writing a direct answer", at: 45 },
  { label: "Crafting quiz questions", at: 95 },
];

const EXPLAIN_PARTS = [
  { num: 1, title: "Foundation", at: 5 },
  { num: 2, title: "Mechanism", at: 40 },
  { num: 3, title: "Real World", at: 75 },
];

const FAST_PARTS = [{ num: 1, title: "Your Answer", at: 10 }];

const facts = [
  "Short spaced sessions beat one giant cram — your brain saves in checkpoints, not one big file.",
  "Explaining a concept to a friend is the fastest way to lock it in. Group chat counts.",
  "Your brain literally rewires while you sleep — tonight it saves what you learn right now.",
  "Quizzing yourself beats re-reading every time. That's why the quizzes here aren't optional.",
  "Attention is trainable in both directions — feeds train it one way, this trains it back.",
  "Ideas stick when they connect to something you already care about. That's the whole trick.",
  "Asking the question already primed your brain to remember the answer. You're ahead.",
];

// Clean vector check — a small, deliberate mark instead of an emoji.
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Props {
  question: string;
  onCancel?: () => void;
  isRevealing?: boolean;
}

// After this long, show a gentle reassurance line — a slow generation should
// feel deliberate ("we're taking care with your lesson"), never broken.
const PATIENCE_MESSAGE_AFTER_MS = 10000;

// The local timer only ever approaches this ceiling asymptotically; it can
// never claim 100% on its own. Real backend progress can push past it, and
// 100% is reserved for the actual completion/reveal signal.
const AUTO_PROGRESS_CEILING = 90;
const AUTO_PROGRESS_TAU_MS = 3000;

export default function LoadingCinematic({ question, onCancel, isRevealing = false }: Props) {
  const progressPercent = useLessonStore((s) => s.progressPercent);
  const mode = usePreferenceStore((s) => s.mode);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [takingLonger, setTakingLonger] = useState(false);
  const displayRef = useRef(0);
  // 0 sentinel — stamped with the real start time in the [question] effect
  // below (Date.now() must not run during render; render must stay pure).
  const startTimeRef = useRef(0);

  const isFast = mode === "fast";
  const steps = isFast ? FAST_STEPS : EXPLAIN_STEPS;
  const parts = isFast ? FAST_PARTS : EXPLAIN_PARTS;

  useEffect(() => {
    const id = window.setTimeout(() => setTakingLonger(true), PATIENCE_MESSAGE_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);

  // Reset the start time whenever a fresh question loads so the auto-progress
  // curve always begins from zero.
  useEffect(() => {
    startTimeRef.current = Date.now();
    displayRef.current = 0;
    setDisplayProgress(0);
  }, [question]);

  // Smoothly animate the bar so it always drifts forward — but honestly.
  // The local curve saturates toward ~90% and stays there while generation is
  // genuinely still running; real server progress events can lead it further,
  // and only the reveal signal drives the bar to 100%.
  useEffect(() => {
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const autoProgress =
        AUTO_PROGRESS_CEILING * (1 - Math.exp(-elapsed / AUTO_PROGRESS_TAU_MS));
      const realLead = progressPercent > 0 ? Math.min(progressPercent + 8, 99) : 0;
      const target = isRevealing ? 100 : Math.min(Math.max(autoProgress, realLead), 99);
      // The reveal window is short (~420ms) — complete the bar immediately so
      // 100% coincides with the real completion signal, not after it.
      const rate = isRevealing ? 1 : 0.12;
      const eased = displayRef.current + (target - displayRef.current) * rate;
      const next = Math.min(100, Math.max(displayRef.current, eased));
      displayRef.current = next;
      setDisplayProgress(next);
    }, 100);
    return () => window.clearInterval(id);
  }, [progressPercent, isRevealing]);

  // Rotate the encouraging facts so there's always something fresh to read.
  useEffect(() => {
    const id = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(100, Math.round(displayProgress));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isFast ? "Generating your answer" : "Generating your lesson"}
      className={`loading-cinematic${isRevealing ? " is-revealing" : ""}`}
    >
      <div className="loading-cinematic__bg" />
      <div className="loading-cinematic__stage">
        <p className="loading-cinematic__question">
          <span className="loading-cinematic__quote">&ldquo;</span>
          <MathText text={question} />
          <span className="loading-cinematic__quote">&rdquo;</span>
        </p>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lesson generation progress"
          className="loading-cinematic__progress"
        >
          <div
            aria-hidden="true"
            className="loading-cinematic__progress-glow"
            style={{ opacity: 0.15 + (pct / 100) * 0.25 }}
          />
          <div
            className="loading-cinematic__progress-bar"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="loading-cinematic__percent">{pct}%</p>

        {/* Step checklist */}
        <ul className="loading-cinematic__steps">
          {steps.map((step, i) => {
            const done = displayProgress >= step.at;
            const active = !done && displayProgress >= (steps[i - 1]?.at ?? 0);
            const stepState = done ? "is-done" : active ? "is-active" : "is-pending";
            return (
              <li
                key={step.label}
                className={`loading-cinematic__step ${stepState}`}
              >
                <span className={`loading-cinematic__step-marker ${stepState}`} aria-hidden="true">
                  {done ? (
                    <CheckIcon />
                  ) : active ? (
                    <span className="accent-pulse-dot loading-cinematic__step-dot" />
                  ) : null}
                </span>
                {step.label}
              </li>
            );
          })}
        </ul>

        {/* The lesson parts materializing as generation reaches them —
            three for an Explain journey, a single answer card in Fast mode. */}
        <div className="loading-cinematic__parts" aria-hidden="true">
          {parts.map((part) => {
            const building = displayProgress >= part.at;
            const ready = isRevealing || displayProgress >= part.at + 30;
            const fill = ready
              ? 100
              : building
                ? Math.min(100, ((displayProgress - part.at) / 30) * 100)
                : 0;
            return (
              <div
                key={part.num}
                className={`loading-cinematic__part${ready ? " is-ready" : building ? " is-building" : ""}`}
              >
                <span>{part.title}</span>
                <span className="loading-cinematic__part-bar">
                  <span style={{ width: `${fill}%` }} />
                </span>
              </div>
            );
          })}
        </div>

        {/* Rotating fact */}
        <div key={factIndex} className="loading-cinematic__fact">
          <p className="loading-cinematic__fact-text">
            <span aria-hidden="true" className="loading-cinematic__fact-star">
              <Icon name="sparkle" size={12} />
            </span>
            {facts[factIndex]}
          </p>
        </div>

        {takingLonger && (
          <p className="loading-cinematic__patience animate-fade-up" role="status">
            Okay, this one&apos;s taking a second — we&apos;re fact-checking your
            lesson instead of making things up. Worth it.
          </p>
        )}

        {onCancel && (
          <button type="button" onClick={onCancel} className="loading-cinematic__cancel">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
