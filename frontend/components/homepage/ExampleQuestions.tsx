"use client";

import { useEffect, useState } from "react";

const EXAMPLES = [
  "Why does the sky turn red at sunset?",
  "How does inflation destroy economies?",
  "What actually happens inside a black hole?",
  "Why did the Roman Empire collapse?",
  "How do vaccines teach the immune system?",
];

interface Props {
  onPick?: (question: string) => void;
}

export default function ExampleQuestions({ onPick }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % EXAMPLES.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      aria-label="Use an example question"
      title="Click to use this example"
      onClick={() => onPick?.(EXAMPLES[index])}
      disabled={!onPick}
      style={{
        fontSize: 12,
        color: "var(--accent)",
        margin: 0,
        fontWeight: 500,
        animation: "fadeUp 200ms var(--ease-reveal)",
        background: "transparent",
        border: "none",
        padding: "4px 8px",
        borderRadius: "var(--radius-sm)",
        cursor: onPick ? "pointer" : "default",
        textAlign: "left",
        transition: "background 200ms var(--ease-color)",
      }}
      onMouseEnter={(e) => {
        if (onPick) e.currentTarget.style.background = "var(--accent-dim)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      Try: {EXAMPLES[index]}
    </button>
  );
}
