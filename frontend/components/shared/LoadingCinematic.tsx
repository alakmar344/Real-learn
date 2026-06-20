"use client";

import { useEffect, useState } from "react";

const messages = [
  "Thinking about your question...",
  "Structuring your learning journey...",
  "Building Part 1...",
  "Adding quiz questions...",
  "Almost ready...",
];

interface Props {
  question: string;
  onCancel?: () => void;
}

export default function LoadingCinematic({ question, onCancel }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label="Generating your lesson"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "var(--bg-primary)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(245,197,24,0.03) 0%, transparent 70%)",
          animation: "loadingGlow 3s ease-in-out infinite",
        }}
      />
      <div style={{ position: "relative", textAlign: "center", padding: 16 }}>
        <div
          className="animate-spin"
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "3px solid rgba(245,197,24,0.3)",
            borderTopColor: "var(--gold-primary)",
            margin: "0 auto",
            display: "grid",
            placeItems: "center",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 20 }}>📖</span>
        </div>
        <p
          key={index}
          aria-live="polite"
          style={{
            marginTop: 18,
            color: "var(--text-secondary)",
            fontSize: "var(--text-base)",
            animation: "fadeUp 350ms var(--ease-reveal)",
          }}
        >
          {messages[index]}
        </p>
        <p
          style={{
            marginTop: 12,
            color: "var(--gold-primary)",
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            fontSize: 20,
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          &ldquo;{question}&rdquo;
        </p>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              marginTop: varSpaceXl,
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 14,
              minHeight: 44,
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

const varSpaceXl = "var(--space-xl)";
