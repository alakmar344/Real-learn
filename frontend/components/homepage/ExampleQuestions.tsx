"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icons";

/* Questions from the learner's world — algorithms, games, money, brains,
   internet culture — each one a real lesson in disguise (CS, econ, bio,
   physics…). Plain, curious phrasing; no slang, no textbook titles. */
const RECOMMENDATIONS = [
  "How does my feed decide what I see?",
  "Why does everything keep getting more expensive?",
  "Can AI actually think, or is it just predicting words?",
  "What does endless scrolling do to my brain?",
  "How do black holes bend time?",
  "How do speedrunners break games with physics?",
  "Why do memes spread like viruses?",
  "What happens in my brain at 3am?",
  "Why do limited-edition sneakers sell for so much?",
  "Why can't we just print more money?",
];

interface Props {
  onPick?: (question: string) => void;
}

/**
 * One suggested question + a shuffle control.
 *
 * This used to auto-rotate on a 3.5s interval — a moving click target that
 * violated WCAG 2.2.2 (no pause/stop for auto-updating content) and could
 * swap the question between read and click. Curiosity is now user-driven:
 * the learner shuffles when THEY want a new spark. Same discovery value,
 * zero motion tax, stable target.
 */
export default function ExampleQuestions({ onPick }: Props) {
  const [index, setIndex] = useState(0);

  // Vary the starting suggestion per visit (after mount, so SSR markup
  // stays deterministic and hydration never mismatches).
  useEffect(() => {
    setIndex(Math.floor(Math.random() * RECOMMENDATIONS.length));
  }, []);

  return (
    <div className="suggest-duo">
      <button
        type="button"
        aria-label="Use a recommended question"
        title="Click to try this question"
        onClick={() => onPick?.(RECOMMENDATIONS[index])}
        disabled={!onPick}
        className="chip suggest-duo__pick"
      >
        <span className="suggest-duo__label">Try:</span>{" "}
        <span>{RECOMMENDATIONS[index]}</span>
      </button>
      <button
        type="button"
        aria-label="Show another suggested question"
        title="Another suggestion"
        onClick={() => setIndex((prev) => (prev + 1) % RECOMMENDATIONS.length)}
        className="chip suggest-duo__shuffle"
      >
        <Icon name="refresh" size={14} />
      </button>
    </div>
  );
}
