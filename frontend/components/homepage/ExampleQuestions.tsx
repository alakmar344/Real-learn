"use client";

import { useEffect, useState } from "react";

const EXAMPLES = [
  "Why does the sky turn red at sunset?",
  "How does inflation destroy economies?",
  "What actually happens inside a black hole?",
  "Why did the Roman Empire collapse?",
  "How do vaccines teach the immune system?",
];

export default function ExampleQuestions() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % EXAMPLES.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p
      key={index}
      aria-live="polite"
      style={{
        fontSize: 12,
        color: "var(--text-tertiary)",
        margin: 0,
        animation: "fadeUp 200ms var(--ease-reveal)",
      }}
    >
      Try: {EXAMPLES[index]}
    </p>
  );
}
