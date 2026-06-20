"use client";

import { useEffect, useRef, useState } from "react";
import { LessonJourney } from "@/types";

interface Props {
  lesson: LessonJourney;
  totalScore: number;
  onRestart?: () => void;
}

/* ── Confetti particles ── */
const CONFETTI_COLORS = [
  "#1a3a5c",
  "var(--correct)",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#f59e0b",
];

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 2 + Math.random() * 1.5,
    }))
  );

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s var(--ease-reveal) both`,
          }}
        />
      ))}
    </div>
  );
}

export default function CompletionScreen({ lesson, totalScore, onRestart }: Props) {
  const [showConfetti, setShowConfetti] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(id);
  }, []);

  /* Announce to screen readers */
  useEffect(() => {
    const el = document.getElementById("sr-live-region");
    if (el) el.textContent = "Journey complete! Your score is " + totalScore + " out of 6.";
  }, [totalScore]);

  const maxScore = 6;
  const pct = Math.round((totalScore / maxScore) * 100);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <section
      ref={sectionRef}
      className="animate-fade-up"
      aria-label="Journey complete"
      style={{
        marginTop: 28,
        borderRadius: "var(--radius-xl)",
        border: "1px solid rgba(26,107,58,0.25)",
        background: "var(--correct-bg)",
        padding: "clamp(20px, 4vw, 32px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {showConfetti && <Confetti />}

      {/* Score circle */}
      <div style={{ display: "flex", alignItems: "center", gap: varSpaceLg, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }} aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="42" fill="none" stroke="var(--border-default)" strokeWidth="6" />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="var(--correct)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              style={{ transition: "stroke-dashoffset 800ms var(--ease-reveal)" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--correct)",
            }}
          >
            {totalScore}/{maxScore}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🎉</div>
          <h3 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Journey Complete</h3>
          <p style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 14 }}>
            You scored <strong style={{ color: "var(--correct)" }}>{totalScore}/{maxScore}</strong> — {pct >= 80 ? "Excellent work!" : pct >= 50 ? "Good effort!" : "Keep practising!"}
          </p>
        </div>
      </div>

      {/* Key takeaways */}
      <div style={{ marginTop: varSpaceLg }}>
        <h4 style={{ margin: "0 0 var(--space-sm)", fontSize: 16, fontWeight: 600 }}>Key Takeaways</h4>
        {lesson.keyTakeaways.map((takeaway, index) => (
          <div
            key={takeaway}
            style={{
              marginBottom: varSpaceSm,
              color: "var(--text-primary)",
              fontSize: 14,
              display: "flex",
              gap: varSpaceSm,
            }}
          >
            <span
              style={{
              color: "var(--accent)",
              fontWeight: 700,
                flexShrink: 0,
                width: 20,
                textAlign: "center",
              }}
            >
              {index + 1}.
            </span>
            <span>{takeaway}</span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {onRestart && (
        <button
          type="button"
          onClick={onRestart}
          style={{
            marginTop: varSpaceLg,
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "transparent",
            color: "var(--text-secondary)",
            padding: "10px 18px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            minHeight: 44,
          }}
        >
          Learn Something New →
        </button>
      )}
    </section>
  );
}

const varSpaceSm = "var(--space-sm)";
const varSpaceLg = "var(--space-lg)";
