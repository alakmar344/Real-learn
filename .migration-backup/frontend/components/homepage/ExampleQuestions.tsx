"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icons";

/* Questions from THEIR world — algorithms, games, money, brains, internet
   culture — each one a real lesson in disguise (CS, econ, bio, physics…). */
const RECOMMENDATIONS = [
  "how does the FYP know me better than my bestie?",
  "why is everything so expensive rn?",
  "can AI actually think or is it just guessing?",
  "what does doomscrolling do to my brain?",
  "how do black holes bend time?",
  "how do speedrunners break games with physics?",
  "why do memes spread like viruses?",
  "what happens in my brain at 3am?",
  "how do sneaker resellers make bank from hype?",
  "why can't we just print more money?",
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
