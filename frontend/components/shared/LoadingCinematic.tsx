"use client";

import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "@/store/lessonStore";

const steps = [
  { label: "Understanding your question", at: 5, stage: "starting" },
  { label: "Researching real-world context", at: 15, stage: "searching" },
  { label: "Writing the foundation", at: 40, stage: "generating" },
  { label: "Explaining how it works", at: 62, stage: "generating" },
  { label: "Connecting it to the real world", at: 85, stage: "generated" },
  { label: "Crafting quiz questions", at: 95, stage: "validating" },
];

const facts = [
  "Spacing study sessions out beats cramming for long-term memory.",
  "Teaching a concept to someone else is one of the fastest ways to master it.",
  "Your brain consolidates new learning while you sleep.",
  "Active recall — quizzing yourself — sticks far better than re-reading.",
  "Connecting ideas to real-world examples makes them easier to remember.",
  "Short breaks between focused study sessions boost how much you retain.",
  "Curiosity primes your brain to absorb information.",
  "Writing things down by hand improves comprehension and recall.",
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

const PATIENCE_MESSAGE_AFTER_MS = 30000;
const AUTO_COMPLETE_DURATION_MS = 3500;

export default function LoadingCinematic({ question, onCancel, isRevealing = false }: Props) {
  const progressPercent = useLessonStore((s) => s.progressPercent);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [takingLonger, setTakingLonger] = useState(false);
  const displayRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const id = window.setTimeout(() => setTakingLonger(true), PATIENCE_MESSAGE_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    displayRef.current = 0;
    setDisplayProgress(0);
  }, [question]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const t = Math.min(elapsed / AUTO_COMPLETE_DURATION_MS, 1);
      const autoProgress = 100 * (1 - Math.pow(1 - t, 3));
      const realLead = progressPercent > 0 ? Math.min(progressPercent + 8, 100) : 0;
      const target = Math.max(autoProgress, realLead);
      const rate = 0.12;
      const eased = displayRef.current + (target - displayRef.current) * rate;
      const next = Math.min(100, Math.max(displayRef.current, eased));
      displayRef.current = next;
      setDisplayProgress(next);
    }, 100);
    return () => window.clearInterval(id);
  }, [progressPercent]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(100, Math.round(displayProgress));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Generating your lesson"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "var(--bg-primary)",
        display: "grid",
        placeItems: "center",
        opacity: isRevealing ? 0 : 1,
        transform: isRevealing ? "scale(0.96)" : "scale(1)",
        transition: "opacity 500ms var(--ease-reveal), transform 500ms var(--ease-reveal)",
        pointerEvents: isRevealing ? "none" : "auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--bg-primary)",
        }}
      />
      <div
        style={{
          position: "relative",
          textAlign: "center",
          padding: 32,
          width: "100%",
          maxWidth: 580,
        }}
      >
        {/* Animated icon */}
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-xl)",
            background: "var(--accent-dim)",
            border: "1px solid var(--border-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 28,
          }}
          className="animate-bounce-in"
        >
          📚
        </div>

        <p
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "clamp(22px, 5vw, 28px)",
            lineHeight: 1.4,
            marginBottom: 32,
          }}
        >
          <span style={{ color: "var(--accent)" }}>&ldquo;</span>
          {question}
          <span style={{ color: "var(--accent)" }}>&rdquo;</span>
        </p>

        {/* Progress bar with glow */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lesson generation progress"
          style={{
            width: "100%",
            height: 10,
            borderRadius: 999,
            background: "var(--accent-dim)",
            overflow: "hidden",
            position: "relative",
            marginBottom: 12,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: 999,
              background: `radial-gradient(ellipse at center, var(--accent) 0%, transparent 70%)`,
              opacity: 0.12 + (pct / 100) * 0.2,
              filter: "blur(10px)",
              transition: "opacity 200ms linear",
            }}
          />
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 80%, var(--correct)) 100%)",
              transition: "width 200ms linear",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <p
            style={{
              margin: 0,
              color: "var(--accent)",
              fontSize: 18,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {pct}%
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>
            {pct < 100 ? "Generating..." : "Almost ready..."}
          </p>
        </div>

        {/* Step checklist */}
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 auto 28px",
            textAlign: "left",
            maxWidth: 360,
            display: "grid",
            gap: 10,
          }}
        >
          {steps.map((step) => {
            const done = displayProgress >= step.at;
            const active = !done && displayProgress >= (steps[steps.indexOf(step) - 1]?.at ?? 0);
            return (
              <li
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: done
                    ? "var(--text-primary)"
                    : active
                      ? "var(--accent)"
                      : "var(--text-tertiary)",
                  opacity: done || active ? 1 : 0.4,
                  fontSize: "var(--text-base)",
                  fontFamily: "var(--font-lora)",
                  fontWeight: done ? 600 : 400,
                  transition: "all 300ms ease",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-md)",
                    flexShrink: 0,
                    border: done
                      ? "none"
                      : "2px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                    background: done ? "var(--accent)" : "transparent",
                    color: done ? "var(--on-accent)" : "inherit",
                    fontSize: 14,
                    transition: "all 300ms var(--ease-color)",
                  }}
                >
                  {done ? (
                    <CheckIcon />
                  ) : active ? (
                    <span
                      className="accent-pulse-dot"
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "var(--accent)",
                      }}
                    />
                  ) : null}
                </span>
                {step.label}
              </li>
            );
          })}
        </ul>

        {/* Rotating fact */}
        <div
          key={factIndex}
          style={{
            marginTop: 20,
            padding: "16px 22px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)",
            background: "color-mix(in srgb, var(--accent) 3%, transparent)",
            animation: "fadeUp 500ms var(--ease-reveal)",
            maxWidth: 420,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: "var(--font-lora)",
            }}
          >
            <span aria-hidden="true" style={{ color: "var(--accent)", marginRight: 8 }}>✦</span>
            {facts[factIndex]}
          </p>
        </div>

        {takingLonger && (
          <p
            className="animate-fade-up"
            role="status"
            style={{
              marginTop: 18,
              color: "var(--accent)",
              fontSize: 14,
              lineHeight: 1.6,
              fontWeight: 600,
              fontStyle: "italic",
              fontFamily: "var(--font-lora)",
            }}
          >
            Taking a little longer than usual — we&apos;re double-checking your
            lesson so it&apos;s worth the wait.
          </p>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="interactive-focus"
            style={{
              marginTop: "var(--space-xl)",
              padding: "14px 28px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
              minHeight: 50,
              transition: "all 500ms var(--ease-spring)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-card-hover)";
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>←</span>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
