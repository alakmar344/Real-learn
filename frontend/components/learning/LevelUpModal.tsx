"use client";

import { useEffect, useState } from "react";

interface Props {
  show: boolean;
  level: number;
  xpGained: number;
  onClose: () => void;
}

const LEVEL_TITLES = ["Novice", "Seeker", "Scholar", "Achiever", "Expert", "Master", "Grandmaster"];

export default function LevelUpModal({ show, level, xpGained }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  useEffect(() => {
    // Haptic feedback
    if (show && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className="animate-fade-up"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        background: "var(--bg-card)",
        border: "2px solid var(--accent)",
        borderRadius: "var(--radius-lg)",
        padding: "24px 32px",
        boxShadow: "var(--shadow-lg)",
        maxWidth: 400,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
      <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
        Level Up!
      </h3>
      <p style={{ margin: "12px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
        You are now a <strong>{LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)]}</strong>
      </p>
      <p style={{ margin: "8px 0 0", color: "var(--text-tertiary)", fontSize: 12 }}>
        +{xpGained} XP earned
      </p>

      {/* Confetti particles */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: `${Math.random() * 100}%`,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i % 3 === 0 ? "var(--accent)" : i % 3 === 1 ? "var(--correct)" : "var(--wrong)",
              animation: `confettiPop 1s ease-out forwards ${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}