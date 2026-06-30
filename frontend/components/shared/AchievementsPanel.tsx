"use client";

import { useState } from "react";
import { useAchievementStore, ACHIEVEMENTS } from "@/store/achievementStore";

export default function AchievementsPanel() {
  const { unlockedAchievements } = useAchievementStore();
  const [open, setOpen] = useState(false);

  if (unlockedAchievements.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          background: "transparent",
          color: "var(--text-primary)",
          padding: "10px 12px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          minHeight: 44,
        }}
      >
        <span style={{ marginRight: 6 }}>🏆</span>
        Achievements ({unlockedAchievements.length})
      </button>

      {open && (
        <div
          className="animate-fade-up"
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unlockedAchievements.map((id) => {
              const ach = ACHIEVEMENTS[id];
              return (
                <span
                  key={id}
                  title={ach?.description}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-card)",
                    fontSize: 12,
                  }}
                >
                  <span>{ach?.icon}</span>
                  <span>{ach?.title}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}