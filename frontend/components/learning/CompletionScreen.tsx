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

/** Generate contextual follow-up suggestions based on the lesson topic and takeaways. */
function generateFollowUpSuggestions(lesson: LessonJourney): string[] {
  const topic = lesson.question ?? lesson.topic ?? "";
  const takeaways = lesson.keyTakeaways ?? [];
  const suggestions: string[] = [];

  if (topic.length > 0) {
    suggestions.push(`What are the real-world applications of ${topic.slice(0, 60)}?`);
  }

  if (takeaways[0]) {
    const short = takeaways[0].slice(0, 80).replace(/\.$/, "");
    suggestions.push(`Can you explain ${short.toLowerCase()} in simpler terms?`);
  }

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
    <section ref={sectionRef} className="completion animate-fade-up" aria-label="Journey complete">
      {showConfetti && <Confetti />}

      {/* Score ring */}
      <div className="completion__hero">
        <div className="completion__ring" aria-hidden="true">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="completion-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-bright)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#completion-ring)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 800ms var(--ease-reveal)" }}
            />
          </svg>
          <div className="completion__ring-score">
            {totalScore}/{maxScore}
          </div>
        </div>

        <div>
          <h3 className="completion__title">
            {(lesson.parts?.length ?? 3) === 1 ? "Got it." : "Journey complete"}
          </h3>
          <p className="completion__subtitle">
            {/* First-try score: quizzes must be perfected to advance, so the
                meaningful number is how you did before any retries. */}
            You scored <strong>{totalScore}/{maxScore}</strong> on the first try — {pct >= 80 ? "a clean run." : pct >= 50 ? "solid, and the retries sealed it." : "a tough one. It'll feel easier next time."}
          </p>
        </div>
      </div>

      {/* Quick summary deck */}
      <QuickSummaryCards lesson={lesson} />

      {/* Suggested follow-up questions — zero cognitive load: just tap */}
      {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
        <div>
          <p className="completion__section-label">Go deeper</p>
          <div className="completion__suggests">
            {generateFollowUpSuggestions(lesson).map((suggestion, i) => (
              <button
                key={i}
                type="button"
                className="suggest-pill"
                onClick={() => {
                  const followUpInput = document.getElementById("followup-input");
                  if (followUpInput) {
                    followUpInput.scrollIntoView({ behavior: "smooth", block: "center" });
                    const event = new CustomEvent("reallearn:fillFollowUp", { detail: suggestion });
                    window.dispatchEvent(event);
                    setTimeout(() => followUpInput.focus(), 500);
                  }
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

      {/* Optional, anonymous review — offered soon after the first lesson */}
      <FeedbackGate />

      {/* Actions */}
      <div className="completion__actions">
        {onRetake && (
          <button type="button" onClick={onRetake} className="btn-toggle">
            Retake Quiz
          </button>
        )}
        {onRestart && (
          <button type="button" onClick={onRestart} className="btn-primary">
            Continue Learning →
          </button>
        )}
      </div>
    </section>
  );
}
