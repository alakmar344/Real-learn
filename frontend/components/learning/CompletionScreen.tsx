"use client";

import { useEffect, useRef, useState } from "react";
import { LessonJourney } from "@/types";
import ShareResult from "@/components/learning/ShareResult";
import FeedbackGate from "@/components/shared/FeedbackGate";

interface Props {
  lesson: LessonJourney;
  totalScore: number;
  onRestart?: () => void;
  onRetake?: () => void;
}

const CONFETTI_COLORS = [
  "#b8372b",
  "#d4443a",
  "#e06b5a",
  "#942c22",
  "#f0c4b8",
  "#2a7a50",
  "#5cb880",
  "#d89a58",
];

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      size: 5 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 2.5 + Math.random() * 2,
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
            borderRadius: p.id % 3 === 0 ? "50%" : p.id % 3 === 1 ? "3px" : "0",
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
  const [showScore, setShowScore] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const confettiId = setTimeout(() => setShowConfetti(false), 4000);
    const scoreId = setTimeout(() => setShowScore(true), 300);
    return () => {
      clearTimeout(confettiId);
      clearTimeout(scoreId);
    };
  }, []);

  const maxScore = Math.max(
    1,
    (lesson.parts ?? []).reduce((sum, part) => sum + (part.quiz?.length ?? 2), 0) ||
      (lesson.parts?.length ?? 3) * 2
  );

  useEffect(() => {
    const el = document.getElementById("sr-live-region");
    if (el) el.textContent = "Journey complete. Your score is " + totalScore + " out of " + maxScore + ".";
  }, [totalScore, maxScore]);
  const pct = Math.round((totalScore / maxScore) * 100);
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (pct / 100) * circumference;

  const getScoreMessage = () => {
    if (pct >= 100) return "Perfect score — you're a master!";
    if (pct >= 80) return "Excellent work — truly impressive!";
    if (pct >= 60) return "Great effort — keep it up!";
    if (pct >= 40) return "Good try — another pass will seal it.";
    return "A tough one — worth another look.";
  };

  return (
    <section
      ref={sectionRef}
      className="animate-fade-up engraved identity-texture texture-noise"
      aria-label="Journey complete"
      style={{
        marginTop: 32,
        borderRadius: "var(--radius-2xl)",
        border: "1px solid color-mix(in srgb, var(--correct) 20%, transparent)",
        background: "var(--correct-bg)",
        padding: "clamp(28px, 5vw, 48px)",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        boxShadow: "var(--shadow-md), var(--glass-edge)",
      }}
    >
      {showConfetti && <Confetti />}

      {/* Score circle */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }} aria-hidden="true">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <defs>
              <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--correct)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <circle cx="55" cy="55" r="44" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
            <circle
              cx="55"
              cy="55"
              r="44"
              fill="none"
              stroke="url(#score-gradient)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 55 55)"
              style={{
                transition: "stroke-dashoffset 800ms var(--ease-reveal)",
                filter: "drop-shadow(0 2px 8px var(--accent-glow))",
              }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: showScore ? 28 : 0,
              fontWeight: 800,
              color: "var(--correct)",
              transition: "all 600ms var(--ease-spring)",
              fontFamily: "var(--font-display)",
            }}
          >
            {totalScore}/{maxScore}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              background: "var(--accent)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.2,
            }}
          >
            {(lesson.parts?.length ?? 3) === 1 ? "Quick Answer Mastered" : "Journey Complete"}
          </h3>
          <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6 }}>
            You scored <strong style={{ color: "var(--correct)" }}>{totalScore}/{maxScore}</strong> — {getScoreMessage()}
          </p>
          <div
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 999,
              background: "var(--accent-dim)",
              border: "1px solid var(--border-accent)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            {pct}% correct
          </div>
        </div>
      </div>

      {/* Key takeaways */}
      <div style={{ marginTop: "var(--space-lg)" }}>
        <h4 style={{ margin: "0 0 var(--space-md)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>💡</span>
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
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "color-mix(in srgb, var(--accent) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
              lineHeight: 1.5,
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

      {/* Optional, anonymous review */}
      <FeedbackGate />

      {/* Action buttons */}
      <div style={{ marginTop: "var(--space-lg)", display: "flex", gap: varSpaceSm, flexWrap: "wrap" }}>
        {onRetake && (
          <button
            type="button"
            onClick={onRetake}
            className="interactive-focus"
            style={{
              border: "1.5px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "14px 24px",
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
              e.currentTarget.style.borderColor = "var(--border-accent)";
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.transform = "scale(1.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>↻</span>
            Retake Quiz
          </button>
        )}
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="interactive-press"
            style={{
              border: "none",
              borderRadius: "var(--radius-lg)",
              background: "var(--accent)",
              color: "var(--on-accent)",
              padding: "14px 28px",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              minHeight: 50,
              boxShadow: "var(--shadow-glow-accent)",
              transition: "all 500ms var(--ease-spring)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--glass-edge)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "var(--shadow-glow-accent)";
            }}
          >
            Continue Learning
            <span aria-hidden="true" style={{ fontSize: 16 }}>→</span>
          </button>
        )}
      </div>
    </section>
  );
}

const varSpaceSm = "var(--space-sm)";

