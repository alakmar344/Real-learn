"use client";

import { useEffect, useRef, useState } from "react";
import { LessonJourney } from "@/types";
import ShareResult from "@/components/learning/ShareResult";
import FeedbackGate from "@/components/shared/FeedbackGate";
import QuickSummaryCards from "@/components/learning/QuickSummaryCards";
import { celebrationColors } from "@/lib/palette";

interface Props {
  lesson: LessonJourney;
  /** Sum of FIRST-ATTEMPT part scores (passing itself always ends perfect). */
  totalScore: number;
  onRestart?: () => void;
  onRetake?: () => void;
}

/* ── Confetti particles — theme-aware brand palette, punchy not rainbow ── */

/** Generate contextual follow-up suggestions based on the lesson topic and takeaways. */
function generateFollowUpSuggestions(lesson: LessonJourney): string[] {
  const topic = lesson.question ?? lesson.topic ?? "";
  const takeaways = lesson.keyTakeaways ?? [];
  const suggestions: string[] = [];

  // Derive follow-ups from the topic itself
  if (topic.length > 0) {
    suggestions.push(`What are the real-world applications of ${topic.slice(0, 60)}?`);
  }

  // Derive from the first takeaway
  if (takeaways[0]) {
    const short = takeaways[0].slice(0, 80).replace(/\.$/, "");
    suggestions.push(`Can you explain ${short.toLowerCase()} in simpler terms?`);
  }

  // Add a comparison/contrast question
  suggestions.push(`How does this compare to similar concepts?`);

  return suggestions.slice(0, 3);
}

function Confetti() {
  const [particles] = useState(() => {
    const colors = celebrationColors();
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      size: 6 + Math.random() * 8,
      color: colors[i % colors.length],
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 360,
    }));
  });

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
  const [takeawaysExpanded, setTakeawaysExpanded] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(id);
  }, []);

  // Max score = the ACTUAL number of quiz questions — salvaged quizzes can
  // have 1 question, so hardcoding 2 per part made perfection unreachable.
  // Guard the denominator: an empty/salvaged lesson (no parts) would otherwise
  // yield maxScore 0 → NaN% and a NaN strokeDashoffset (broken ring).
  const maxScore = Math.max(
    1,
    (lesson.parts ?? []).reduce((sum, part) => sum + (part.quiz?.length ?? 2), 0) ||
      (lesson.parts?.length ?? 3) * 2
  );

  /* Announce to screen readers */
  useEffect(() => {
    const el = document.getElementById("sr-live-region");
    if (el) el.textContent = "Journey complete. Your first-try score is " + totalScore + " out of " + maxScore + ".";
  }, [totalScore, maxScore]);
  const pct = Math.round((totalScore / maxScore) * 100);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (pct / 100) * circumference;

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
      <div style={{ display: "flex", alignItems: "center", gap: varSpaceLg, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }} aria-hidden="true">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--accent)"
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
              color: "var(--accent)",
            }}
          >
            {(lesson.parts?.length ?? 3) === 1 ? "Got it." : "Journey complete"}
          </h3>
          <p style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 15 }}>
            {/* First-try score: quizzes must be perfected to advance, so the
                meaningful number is how you did before any retries. */}
            You scored <strong style={{ color: "var(--correct)" }}>{totalScore}/{maxScore}</strong> on the first try — {pct >= 80 ? "a clean run." : pct >= 50 ? "solid, and the retries sealed it." : "a tough one. It'll feel easier next time."}
          </p>
        </div>
      </div>

      {/* Stylized Gen Z & Gen Alpha Quick Summary Deck */}
      <QuickSummaryCards lesson={lesson} />

      {/* Suggested follow-up questions — zero cognitive load: just tap */}
      {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
        <div style={{ marginTop: varSpaceLg }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500 }}>
            Go deeper
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {generateFollowUpSuggestions(lesson).map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const followUpInput = document.getElementById("followup-input");
                  if (followUpInput) {
                    followUpInput.scrollIntoView({ behavior: "smooth", block: "center" });
                    // Dispatch a custom event with the suggestion text
                    const event = new CustomEvent("reallearn:fillFollowUp", { detail: suggestion });
                    window.dispatchEvent(event);
                    setTimeout(() => followUpInput.focus(), 500);
                  }
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 200ms var(--ease-spring)",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-accent)";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Share your result */}
      <ShareResult question={lesson.question ?? lesson.topic ?? ""} totalScore={totalScore} maxScore={maxScore} />

      {/* Optional, anonymous review — shown the day after the first lesson */}
      <FeedbackGate />

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
              padding: "14px 24px",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
              minHeight: 50,
              transition: "all 500ms var(--ease-spring)",
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
              padding: "14px 28px",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
              minHeight: 50,
              boxShadow: "var(--shadow-sm)",
              transition: "all 500ms var(--ease-spring)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--glass-edge)";
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
