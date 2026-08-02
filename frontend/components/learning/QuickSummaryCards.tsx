"use client";

import { useState } from "react";
import { LessonJourney } from "@/types";
import { Icon } from "@/components/shared/icons";

interface Props {
  lesson: LessonJourney;
}

export default function QuickSummaryCards({ lesson }: Props) {
  const takeaways = lesson.keyTakeaways ?? [];
  const parts = lesson.parts ?? [];
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (takeaways.length === 0) return null;

  const totalCards = takeaways.length;
  const currentTakeaway = takeaways[activeCardIndex];
  const currentPart = parts[activeCardIndex] ?? parts[0];

  const handleCopyCard = async () => {
    try {
      const textToCopy = `Quick Summary (${activeCardIndex + 1}/${totalCards}): ${lesson.question ?? lesson.topic ?? ""}\n\n${currentTakeaway}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Best-effort copy
    }
  };

  const handleNext = () => {
    setActiveCardIndex((prev) => (prev + 1) % totalCards);
  };

  const handlePrev = () => {
    setActiveCardIndex((prev) => (prev - 1 + totalCards) % totalCards);
  };

  return (
    <div
      className="quick-summary-deck"
      style={{
        marginTop: 24,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-accent-strong)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="zap" size={14} /> Quick Takeaway Cards ({activeCardIndex + 1} of {totalCards})
        </span>
        <button
          type="button"
          onClick={handleCopyCard}
          aria-label="Copy summary card text"
          className="btn-ghost"
          style={{ fontSize: 12, padding: "4px 10px", minHeight: 28, display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <Icon name={copied ? "check" : "clipboard-check"} size={12} />
          {copied ? "Copied" : "Copy Card"}
        </button>
      </div>

      <div
        className="kinetic-card animate-fade-up"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-xl)",
          padding: "24px 20px",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              className="chip__label"
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: "var(--accent-dim)",
                color: "var(--accent)",
                padding: "2px 8px",
                borderRadius: 10,
              }}
            >
              {currentPart?.title ?? `Part ${activeCardIndex + 1}`}
            </span>
          </div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-primary)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {currentTakeaway}
          </p>
        </div>

        {/* Navigation Dots & Next/Prev Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 18,
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {takeaways.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to card ${idx + 1}`}
                onClick={() => setActiveCardIndex(idx)}
                style={{
                  width: idx === activeCardIndex ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: idx === activeCardIndex ? "var(--accent)" : "var(--border-default)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transition: "all 200ms ease",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous card"
              className="btn-icon"
              style={{ width: 30, height: 30, minHeight: "auto", fontSize: 12 }}
            >
              <Icon name="arrow-left" size={14} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next card"
              className="btn-icon"
              style={{ width: 30, height: 30, minHeight: "auto", fontSize: 12 }}
            >
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
