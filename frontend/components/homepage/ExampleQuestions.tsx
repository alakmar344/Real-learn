"use client";

import { useEffect, useState } from "react";

const RECOMMENDATIONS = [
  "How does artificial intelligence actually learn?",
  "Why do we dream when we sleep?",
  "How does compound interest build wealth?",
  "What causes earthquakes and tsunamis?",
  "Why did the Roman Empire collapse?",
  "How do airplanes stay up in the air?",
  "What is quantum computing in simple terms?",
  "How does the human immune system fight viruses?",
  "Why is the ocean salty?",
  "How do black holes bend time and space?",
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
      className="chip"
      style={{
        fontSize: 12,
        color: "var(--accent)",
        margin: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        textAlign: "left",
      }}
    >
      <span style={{ color: "var(--text-tertiary)", fontWeight: 500, marginRight: 4 }}>💡 Try:</span>{" "}
      <span>{RECOMMENDATIONS[index]}</span>
    </button>
  );
}
