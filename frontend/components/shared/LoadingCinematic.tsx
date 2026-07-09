"use client";

import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "@/store/lessonStore";

// Each step "completes" once the real progress passes its threshold.
const steps = [
  { label: "Understanding your question", at: 5, stage: "starting" },
  { label: "Researching real-world context", at: 15, stage: "searching" },
  { label: "Writing the foundation", at: 40, stage: "generating" },
  { label: "Explaining how it works", at: 40, stage: "generating" },
  { label: "Connecting it to the real world", at: 85, stage: "generated" },
  { label: "Crafting quiz questions", at: 95, stage: "validating" },
];

const facts = [
  "Did you know? Spacing your study sessions out beats cramming for long-term memory.",
  "Tip: Teaching a concept to someone else is one of the fastest ways to master it.",
  "Did you know? Your brain consolidates new learning while you sleep.",
  "Tip: Active recall — quizzing yourself — sticks far better than re-reading.",
  "Did you know? Connecting ideas to real-world examples makes them easier to remember.",
  "Tip: Short breaks between focused study boosts how much you retain.",
  "Did you know? Curiosity literally primes your brain to absorb information.",
];

interface Props {
  question: string;
  onCancel?: () => void;
}

export default function LoadingCinematic({ question, onCancel }: Props) {
  const progressPercent = useLessonStore((s) => s.progressPercent);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const displayRef = useRef(0);

  // Smoothly animate toward the real progress value. When real progress
  // jumps (e.g. 5 → 15 → 30 → 40 → 85 → 95), the display catches up
  // with a smooth ease. Between events it creeps forward slowly so the
  // bar never feels stuck.
  useEffect(() => {
    const id = window.setInterval(() => {
      const target = progressPercent > 0 ? progressPercent : 95;
      // If we have real progress, move toward it faster (0.12 per tick).
      // If no real progress yet (waiting for first event), creep slowly
      // toward 95 so the bar still moves during the initial network roundtrip.
      const rate = progressPercent > 0 ? 0.12 : 0.03;
      const next = displayRef.current + (target - displayRef.current) * rate;
      displayRef.current = next;
      setDisplayProgress(next);
    }, 100);
    return () => window.clearInterval(id);
  }, [progressPercent]);

  // Rotate the encouraging facts so there's always something fresh to read.
  useEffect(() => {
    const id = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(99, Math.round(displayProgress));

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
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, var(--accent-dim) 0%, transparent 70%)",
          animation: "loadingGlow 3s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "relative",
          textAlign: "center",
          padding: 24,
          width: "100%",
          maxWidth: 520,
        }}
      >
        <p
          style={{
            color: "var(--accent)",
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            fontSize: 22,
            lineHeight: 1.4,
            marginBottom: 28,
          }}
        >
          &ldquo;{question}&rdquo;
        </p>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            width: "100%",
            height: 8,
            borderRadius: 999,
            background: "var(--accent-dim)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: "var(--accent)",
              transition: "width 200ms linear",
              backgroundImage:
                "linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, transparent) 50%, var(--accent) 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.6s linear infinite",
            }}
          />
        </div>
        <p
          style={{
            marginTop: 8,
            color: "var(--text-secondary)",
            fontSize: 13,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pct}%
        </p>

        {/* Step checklist */}
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "20px auto 0",
            textAlign: "left",
            maxWidth: 320,
            display: "grid",
            gap: 10,
          }}
        >
          {steps.map((step) => {
            const done = displayProgress >= step.at;
            const active =
              !done &&
              displayProgress >= (steps[steps.indexOf(step) - 1]?.at ?? 0);
            return (
              <li
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: done
                    ? "var(--text-primary)"
                    : active
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  opacity: done || active ? 1 : 0.5,
                  fontSize: "var(--text-base)",
                  fontFamily: "var(--font-lora)",
                  transition: "opacity 300ms ease, color 300ms ease",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: done
                      ? "none"
                      : "2px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                    background: done ? "var(--accent)" : "transparent",
                    color: "var(--on-accent)",
                    fontSize: 12,
                  }}
                >
                  {done ? (
                    "✓"
                  ) : active ? (
                    <span
                      className="accent-pulse-dot"
                      style={{
                        width: 8,
                        height: 8,
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
        <p
          key={factIndex}
          style={{
            marginTop: 26,
            color: "var(--text-secondary)",
            fontSize: 14,
            lineHeight: 1.5,
            minHeight: 42,
            fontFamily: "var(--font-lora)",
            animation: "fadeUp 400ms var(--ease-reveal)",
          }}
        >
          {facts[factIndex]}
        </p>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              marginTop: "var(--space-xl)",
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 14,
              minHeight: 44,
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
