"use client";

import { useEffect, useState } from "react";

const RECOMMENDATIONS = [
  "Explain quantum physics like I'm 5 🧠",
  "Why is inflation hurting my wallet? 💸",
  "Is AI going to take my job? 🤖",
  "How do black holes bend time and space? 🌌",
  "Why do we dream when we sleep? 🌙",
  "How do airplanes stay up in the air? ✈️",
  "What actually caused the Roman Empire to collapse? 🏛️",
  "How does the human immune system fight viruses? 🦠",
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
