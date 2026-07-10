"use client";

import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "@/store/lessonStore";

// Each step "completes" once the real progress passes its threshold. The
// thresholds are spread across the whole 0–100 range (no two steps share a
// value) so the checklist advances continuously alongside the bar instead of
// two items lighting up at once and then stalling.
const steps = [
  { label: "Understanding your question", at: 5, stage: "starting", emoji: "🧠" },
  { label: "Researching real-world context", at: 15, stage: "searching", emoji: "🔍" },
  { label: "Writing the foundation", at: 40, stage: "generating", emoji: "✍️" },
  { label: "Explaining how it works", at: 62, stage: "generating", emoji: "💡" },
  { label: "Connecting it to the real world", at: 85, stage: "generated", emoji: "🌍" },
  { label: "Crafting quiz questions", at: 95, stage: "validating", emoji: "🎯" },
];

const facts = [
  "Spacing your study sessions out beats cramming for long-term memory 📚",
  "Teaching a concept to someone else is one of the fastest ways to master it 🗣️",
  "Your brain consolidates new learning while you sleep 😴",
  "Active recall — quizzing yourself — sticks far better than re-reading 🧪",
  "Connecting ideas to real-world examples makes them easier to remember 🌍",
  "Short breaks between focused study boosts how much you retain ⏱️",
  "Curiosity literally primes your brain to absorb information 🧲",
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

  // Smoothly animate the bar so it ALWAYS drifts forward, even between server
  // events. The previous version eased toward exactly `progressPercent`, so
  // once a milestone arrived (e.g. 40% at the start of generation) the bar
  // asymptotically parked on that number and looked frozen for the entire
  // wait. Instead we ease toward a small *lead* beyond the last real value and
  // clamp the motion to be strictly monotonic — the bar keeps inching ahead,
  // catches up quickly when a new milestone lands, and never slides backward.
  useEffect(() => {
    const id = window.setInterval(() => {
      // Lead a little past the last real event so the bar never rests exactly
      // on a milestone. Before the first event, drift gently toward 90%.
      const target =
        progressPercent > 0 ? Math.min(progressPercent + 6, 99) : 90;
      const rate = progressPercent > 0 ? 0.08 : 0.02;
      const eased = displayRef.current + (target - displayRef.current) * rate;
      // Never regress: a new lower `target` (shouldn't happen, but be safe)
      // or float jitter must not pull the bar backward.
      const next = Math.max(displayRef.current, eased);
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
          background: "var(--bg-primary)",
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
            fontWeight: 700,
            fontSize: 24,
            lineHeight: 1.4,
            marginBottom: 32,
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
            height: 10,
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
            }}
          />
        </div>
        <p
          style={{
            marginTop: 10,
            color: "var(--accent)",
            fontSize: 15,
            fontWeight: 700,
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
            margin: "24px auto 0",
            textAlign: "left",
            maxWidth: 340,
            display: "grid",
            gap: 12,
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
                  gap: 12,
                  color: done
                    ? "var(--text-primary)"
                    : active
                    ? "var(--accent)"
                    : "var(--text-secondary)",
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
                  }}
                >
                  {done ? (
                    step.emoji
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
        <p
          key={factIndex}
          style={{
            marginTop: 28,
            color: "var(--text-secondary)",
            fontSize: 14,
            lineHeight: 1.6,
            minHeight: 44,
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
              padding: "12px 24px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              minHeight: 48,
              transition: "all 200ms var(--ease-color)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-card-hover)";
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border-default)";
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
