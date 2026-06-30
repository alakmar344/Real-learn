"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { useAchievementStore } from "@/store/achievementStore";
import { useLesson } from "@/hooks/useLesson";

export default function DailyChallengeBanner() {
  const { dailyChallenge, checkDailyChallenge } = useNotificationStore();
  const addXP = useAchievementStore((s) => s.addXP);
  const { generateLesson } = useLesson();

  useEffect(() => {
    checkDailyChallenge();
  }, [checkDailyChallenge]);

  if (!dailyChallenge || dailyChallenge.completed) return null;

  const handleAccept = async () => {
    addXP(dailyChallenge.xpBonus);
    await generateLesson(dailyChallenge.question, true);
  };

  return (
    <div
      className="animate-fade-up"
      aria-label="Daily challenge available"
      style={{
        margin: "16px auto",
        maxWidth: 600,
        padding: 16,
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(135deg, var(--accent-dim) 0%, var(--correct-bg) 100%)",
        border: "1px solid var(--accent)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>🎯</span>
        <span style={{ fontWeight: 600, color: "var(--accent)" }}>Daily Challenge</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-tertiary)" }}>+{dailyChallenge.xpBonus} XP</span>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
        {dailyChallenge.question}
      </p>
      <button
        type="button"
        onClick={handleAccept}
        style={{
          alignSelf: "flex-start",
          padding: "8px 16px",
          border: "none",
          borderRadius: "var(--radius-md)",
          background: "var(--accent)",
          color: "#faf7f2",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          minHeight: 40,
        }}
      >
        I&apos;ll Learn This
      </button>
    </div>
  );
}