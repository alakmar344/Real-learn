"use client";

import { useEffect, useRef, useState } from "react";

// Each step "completes" once the simulated progress passes its threshold.
const steps = [
  { label: "Understanding your question", at: 8 },
  { label: "Researching real-world context", at: 26 },
  { label: "Writing the foundation", at: 45 },
  { label: "Explaining how it works", at: 64 },
  { label: "Connecting it to the real world", at: 80 },
  { label: "Crafting quiz questions", at: 92 },
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
  const [progress, setProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const progressRef = useRef(0);

  // Smoothly ease progress toward an asymptote (~95%) so the bar always
  // appears to move and naturally slows down near the end — it never reaches
  // 100% until the real lesson arrives and this component unmounts.
  useEffect(() => {
    const id = window.setInterval(() => {
      const target = 95;
      const next = progressRef.current + (target - progressRef.current) * 0.04;
      progressRef.current = next;
      setProgress(next);
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  // Rotate the encouraging facts so there's always something fresh to read.
  useEffect(() => {
    const id = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(99, Math.round(progress));

  return (
    <div
      role="alert"
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
            const done = progress >= step.at;
            const active =
              !done &&
              progress >= (steps[steps.indexOf(step) - 1]?.at ?? 0);
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
