"use client";

import { useEffect, useState } from "react";

/* Questions from THEIR world — algorithms, games, money, brains, internet
   culture — each one a real lesson in disguise (CS, econ, bio, physics…). */
const RECOMMENDATIONS = [
  "How does my For You page know me so well? 🧠",
  "Why is everything so expensive right now? 💸",
  "How does AI actually learn — and can it think? 🤖",
  "What does doomscrolling do to my brain? 📱",
  "How do black holes bend time itself? 🌌",
  "How do speedrunners break games with physics? 🎮",
  "Why do memes spread exactly like viruses? 🦠",
  "What actually happens in my brain at 3am? 🌙",
  "How do sneaker resellers make money from hype? 👟",
  "Why can't we just print more money? 🏦",
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
      <button
        type="button"
        aria-label="Use a recommended question"
        title="Click to try this question"
        onClick={() => onPick?.(RECOMMENDATIONS[index])}
        disabled={!onPick}
        className="chip"
        style={{
          fontSize: 12,
          color: "var(--accent)",
          margin: 0,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "left",
        }}
      >
        <span style={{ color: "var(--text-tertiary)", fontWeight: 500, marginRight: 4 }}>💡 Try:</span>{" "}
        <span>{RECOMMENDATIONS[index]}</span>
      </button>
      <button
        type="button"
        aria-label="Show another suggested question"
        title="Another suggestion"
        onClick={() => setIndex((prev) => (prev + 1) % RECOMMENDATIONS.length)}
        className="chip"
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          margin: 0,
          minWidth: 44,
          minHeight: 36,
          flexShrink: 0,
          justifyContent: "center",
        }}
      >
        ↻
      </button>
    </div>
  );
}
