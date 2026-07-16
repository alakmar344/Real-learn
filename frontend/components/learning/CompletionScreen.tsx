"use client";

import { useEffect, useRef, useState } from "react";
import { LessonJourney } from "@/types";
import ShareResult from "@/components/learning/ShareResult";

interface Props {
  lesson: LessonJourney;
  totalScore: number;
  onRestart?: () => void;
  onRetake?: () => void;
}

/* ── Confetti particles — vibrant, modern colors ── */
const CONFETTI_COLORS = [
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
];

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 360,
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
            borderRadius: p.id % 3 === 0 ? "50%" : p.id % 3 === 1 ? "2px" : "0",
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s var(--ease-reveal) both`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function CompletionScreen({ lesson, totalScore, onRestart, onRetake }: Props) {
  const [showConfetti, setShowConfetti] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(id);
  }, []);

  // Max score = the ACTUAL number of quiz questions — salvaged quizzes can
  // have 1 question, so hardcoding 2 per part made perfection unreachable.
  const maxScore = (lesson.parts ?? []).reduce(
    (sum, part) => sum + (part.quiz?.length ?? 2),
    0
  ) || (lesson.parts?.length ?? 3) * 2;

  /* Announce to screen readers */
  useEffect(() => {
    const el = document.getElementById("sr-live-region");
    if (el) el.textContent = "Journey complete. Your score is " + totalScore + " out of " + maxScore + ".";
  }, [totalScore, maxScore]);
  const pct = Math.round((totalScore / maxScore) * 100);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <section
      ref={sectionRef}
      className="animate-fade-up"
      aria-label="Journey complete"
      style={{
        marginTop: 32,
        borderRadius: "var(--radius-2xl)",
        border: "1px solid color-mix(in srgb, var(--correct) 25%, transparent)",
        background: "var(--correct-bg)",
        padding: "clamp(24px, 5vw, 40px)",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        boxShadow: "var(--shadow-md), var(--glass-edge)",
      }}
    >
      {showConfetti && <Confetti />}

      {/* Score circle */}
      <div style={{ display: "flex", alignItems: "center", gap: varSpaceLg, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }} aria-hidden="true">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#score-gradient)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 800ms var(--ease-reveal)" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              fontWeight: 800,
              color: "var(--correct)",
            }}
          >
            {totalScore}/{maxScore}
          </div>
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 800,
              background: "var(--accent)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {(lesson.parts?.length ?? 3) === 1 ? "Quick Answer Mastered" : "Journey Complete"}
          </h3>
          <p style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 15 }}>
            You scored <strong style={{ color: "var(--correct)" }}>{totalScore}/{maxScore}</strong> — {pct >= 80 ? "excellent work." : pct >= 50 ? "a solid effort." : "a tough one, worth another pass."}
          </p>
        </div>
      </div>

      {/* Key takeaways */}
      <div style={{ marginTop: varSpaceLg }}>
        <h4 style={{ margin: "0 0 var(--space-md)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Key takeaways
        </h4>
        {(lesson.keyTakeaways ?? []).map((takeaway, index) => (
          <div
            key={`${index}-${takeaway}`}
            style={{
              marginBottom: varSpaceSm,
              color: "var(--text-primary)",
              fontSize: 14,
              display: "flex",
              gap: varSpaceSm,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "color-mix(in srgb, var(--accent) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
            }}
          >
            <span
              style={{
                color: "var(--accent)",
                fontWeight: 800,
                flexShrink: 0,
                width: 24,
                textAlign: "center",
              }}
            >
              {index + 1}.
            </span>
            <span style={{ fontWeight: 500 }}>{takeaway}</span>
          </div>
        ))}
      </div>

      {/* Share your result */}
      <ShareResult question={lesson.question ?? lesson.topic ?? ""} totalScore={totalScore} maxScore={maxScore} />

      {/* Action buttons */}
      <div style={{ marginTop: varSpaceLg, display: "flex", gap: varSpaceSm, flexWrap: "wrap" }}>
        {onRetake && (
          <button
            type="button"
            onClick={onRetake}
            style={{
              border: "1.5px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "12px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              minHeight: 48,
              transition: "all 350ms var(--ease-spring)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-accent)";
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Retake Quiz
          </button>
        )}
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            style={{
              border: "none",
              borderRadius: "var(--radius-lg)",
              background: "var(--accent)",
              color: "var(--on-accent)",
              padding: "12px 24px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              minHeight: 48,
              boxShadow: "var(--shadow-sm)",
              transition: "all 350ms var(--ease-spring)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.boxShadow = "var(--shadow-md), var(--glass-edge)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            Continue Learning →
          </button>
        )}
      </div>
    </section>
  );
}

const varSpaceSm = "var(--space-sm)";
const varSpaceLg = "var(--space-lg)";
