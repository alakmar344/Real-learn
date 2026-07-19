"use client";

import { useEffect, useState } from "react";

const EXAMPLES = [
  "Why does the sky turn red at sunset?",
  "How does inflation destroy economies?",
  "What actually happens inside a black hole?",
  "Why did the Roman Empire collapse?",
  "How do vaccines teach the immune system?",
  "What is the speed of thought?",
  "Why do cats purr?",
  "How does GPS know where you are?",
];

interface Props {
  onPick?: (question: string) => void;
}

export default function ExampleQuestions({ onPick }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % EXAMPLES.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      aria-label="Use an example question"
      title="Click to use this example"
      onClick={() => onPick?.(EXAMPLES[index])}
      disabled={!onPick}
      className="interactive-focus"
      style={{
        fontSize: 13,
        color: "var(--accent)",
        margin: 0,
        fontWeight: 500,
        animation: "fadeUp 300ms var(--ease-reveal)",
        background: "transparent",
        border: "1px solid transparent",
        padding: "6px 12px",
        borderRadius: "var(--radius-md)",
        cursor: onPick ? "pointer" : "default",
        textAlign: "left",
        transition: "all 250ms var(--ease-color)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      onMouseEnter={(e) => {
        if (onPick) {
          e.currentTarget.style.background = "var(--accent-dim)";
          e.currentTarget.style.borderColor = "var(--border-accent)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 14 }}>💡</span>
      Try: {EXAMPLES[index]}
    </button>
  );
}
