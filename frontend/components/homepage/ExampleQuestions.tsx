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

export default function ExampleQuestions({ onPick }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % RECOMMENDATIONS.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      aria-label="Use a recommended question"
      title="Click to try this question"
      onClick={() => onPick?.(RECOMMENDATIONS[index])}
      disabled={!onPick}
      className="chip electric-card"
      style={{
        fontSize: 12,
        color: "var(--accent)",
        margin: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        textAlign: "left",
        border: "1px solid var(--border-neon)",
        background: "var(--brand-soft)",
        boxShadow: "0 0 12px var(--accent-glow)",
        padding: "6px 14px",
        borderRadius: "var(--radius-pill)",
        transition: "all 250ms var(--ease-spring)",
      }}
    >
      <span style={{ color: "var(--text-accent-strong)", fontWeight: 700, marginRight: 6 }}>⚡ Gen Z Spark:</span>{" "}
      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{RECOMMENDATIONS[index]}</span>
    </button>
  );
}
