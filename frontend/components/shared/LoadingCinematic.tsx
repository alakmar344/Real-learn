"use client";

import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "@/store/lessonStore";

// Each step "completes" once the real progress passes its threshold. The
// thresholds are spread across the whole 0–100 range (no two steps share a
// value) so the checklist advances continuously alongside the bar instead of
// two items lighting up at once and then stalling.
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
const PATIENCE_MESSAGE_AFTER_MS = 30000;

// Auto-complete the counter to 100% in ~3.5s with an ease-out curve so it
// always reaches full progress even when the backend only sends a handful of
// progress events (e.g. fast-mode Cerebras can finish in 2-3s).
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

  // Reset the start time whenever a fresh question loads so the auto-complete
  // curve always begins from zero.
  useEffect(() => {
    startTimeRef.current = Date.now();
    displayRef.current = 0;
    setDisplayProgress(0);
  }, [question]);

  // Smoothly animate the bar so it ALWAYS drifts forward. An ease-out curve
  // auto-completes to 100% in ~3.5s, and any real server progress event leads
  // the counter by a small margin so it never stalls. When the lesson arrives,
  // the parent passes `isRevealing` and we fade out gracefully.
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
      aria-label="Generating your lesson"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "var(--bg-primary)",
        display: "grid",
        placeItems: "center",
        opacity: isRevealing ? 0 : 1,
        transform: isRevealing ? "scale(0.97)" : "scale(1)",
        transition: "opacity 400ms var(--ease-reveal), transform 400ms var(--ease-reveal)",
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
          padding: 24,
          width: "100%",
          maxWidth: 520,
        }}
      >
        <p
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-playfair)",
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

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lesson generation progress"
          style={{
            width: "100%",
            height: 12,
            borderRadius: 999,
            background: "var(--accent-dim)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: 999,
              background: "radial-gradient(ellipse at center, var(--accent) 0%, transparent 70%)",
              opacity: 0.15 + (pct / 100) * 0.25,
              filter: "blur(8px)",
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
            marginTop: 28,
            padding: "12px 18px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
            background: "color-mix(in srgb, var(--accent) 4%, transparent)",
            animation: "fadeUp 400ms var(--ease-reveal)",
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
              marginTop: 16,
              color: "var(--accent)",
              fontSize: 13,
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
