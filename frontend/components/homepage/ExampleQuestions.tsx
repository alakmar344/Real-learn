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
      className="chip"
      style={{
        fontSize: 12,
        color: "var(--accent)",
        margin: 0,
        animation: "fadeUp 200ms var(--ease-reveal)",
      }}
    >
      <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>Try:</span>{" "}
      {EXAMPLES[index]}
    </button>
  );
}
