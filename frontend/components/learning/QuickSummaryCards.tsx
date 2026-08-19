"use client";

import { useState } from "react";
import { LessonJourney } from "@/types";
import { Icon } from "@/components/shared/icons";
import { contentLangAttrs } from "@/lib/locale";

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
      const textToCopy =
        totalCards > 1
          ? `Quick Summary (${activeCardIndex + 1}/${totalCards}): ${lesson.question ?? lesson.topic ?? ""}\n\n${currentTakeaway}`
          : `Key Takeaway: ${lesson.question ?? lesson.topic ?? ""}\n\n${currentTakeaway}`;
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
    <div className="summary-deck">
      <div className="summary-deck__head">
        <span className="summary-deck__label">
          <Icon name="zap" size={14} />{" "}
          {totalCards > 1
            ? `Quick Takeaway Cards (${activeCardIndex + 1} of ${totalCards})`
            : "Key Takeaway"}
        </span>
        <button
          type="button"
          onClick={handleCopyCard}
          aria-label={totalCards > 1 ? "Copy summary card text" : "Copy key takeaway text"}
          className="btn-ghost summary-deck__copy"
        >
          <Icon name={copied ? "check" : "clipboard-check"} size={13} />
          {copied ? "Copied" : totalCards > 1 ? "Copy Card" : "Copy Takeaway"}
        </button>
      </div>

      <div className="summary-card animate-fade-up">
        <div>
          <span className="summary-card__tag">
            {currentPart?.title ?? `Part ${activeCardIndex + 1}`}
          </span>
          <p className="summary-card__text" {...contentLangAttrs(lesson.language)}>
            {currentTakeaway}
          </p>
        </div>

        {/* Navigation dots & next/prev controls (only rendered when multiple cards exist) */}
        {totalCards > 1 && (
          <div className="summary-card__nav">
            <div className="summary-card__dots">
              {takeaways.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Go to card ${idx + 1}`}
                  aria-current={idx === activeCardIndex}
                  onClick={() => setActiveCardIndex(idx)}
                  className={`summary-dot${idx === activeCardIndex ? " summary-dot--active" : ""}`}
                />
              ))}
            </div>

            <div className="summary-card__arrows">
              <button type="button" onClick={handlePrev} aria-label="Previous card" className="btn-icon">
                <Icon name="arrow-left" size={15} />
              </button>
              <button type="button" onClick={handleNext} aria-label="Next card" className="btn-icon">
                <Icon name="arrow-right" size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
