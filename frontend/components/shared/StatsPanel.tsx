"use client";

import { useEffect } from "react";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, levelTitle, ProgressSnapshot } from "@/lib/achievements";
import ActivityHeatmap from "@/components/shared/ActivityHeatmap";
import AchievementsGrid from "@/components/shared/AchievementsGrid";

interface Props {
  open: boolean;
  onClose: () => void;
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        padding: "12px 10px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? "var(--accent)" : "var(--text-primary)", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function StatsPanel({ open, onClose }: Props) {
  const s = useProgressStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const info = levelInfo(s.xp);
  const snapshot: ProgressSnapshot = {
    xp: s.xp,
    level: info.level,
    streak: s.streak,
    longestStreak: s.longestStreak,
    lessonsCompleted: s.lessonsCompleted,
    partsPassed: s.partsPassed,
    perfectParts: s.perfectParts,
    perfectLessons: s.perfectLessons,
    languagesUsed: s.languagesUsed,
    subjectsSeen: s.subjectsSeen,
    followUps: s.followUps,
    dailyGoalsMet: s.dailyGoalsMet,
    lastActivityHour: s.lastActivityHour,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your learning progress"
      className="animate-overlay-fade"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(20,17,12,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-up"
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--bg-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "clamp(18px, 4vw, 28px)",
        }}
      >
        {/* Header: level + XP */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "#faf7f2",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 20,
                flexShrink: 0,
                boxShadow: "var(--shadow-glow-accent)",
              }}
            >
              {info.level}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                Level {info.level} · {levelTitle(info.level)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                {info.totalXp.toLocaleString()} XP total
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              fontSize: 18,
              padding: 6,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* XP bar */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "var(--border-subtle)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              className="animate-sheen"
              style={{
                position: "relative",
                width: `${Math.round(info.progress * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--accent), var(--accent-hover))",
                borderRadius: 999,
                transition: "width 700ms var(--ease-reveal)",
                overflow: "hidden",
              }}
            />
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-tertiary)", textAlign: "right" }}>
            {info.intoLevel} / {info.forNext} XP to Level {info.level + 1}
          </div>
        </div>

        {/* Streak banner */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            padding: "12px 14px",
          }}
        >
          <span className={s.streak > 0 ? "flame-flicker" : undefined} style={{ fontSize: 30, filter: s.streak > 0 ? "none" : "grayscale(1)" }}>
            🔥
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              {s.streak}-day streak
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Longest {s.longestStreak} · {s.streakFreezes} freeze{s.streakFreezes === 1 ? "" : "s"} 🛡️
            </div>
          </div>
        </div>

        {/* Daily goal control */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Daily goal · {Math.min(s.dailyCountDay === null ? 0 : s.dailyCount, s.dailyGoal)}/{s.dailyGoal} parts
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 3, 5, 8].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => s.setDailyGoal(g)}
                  style={{
                    border: `1px solid ${s.dailyGoal === g ? "var(--accent)" : "var(--border-default)"}`,
                    background: s.dailyGoal === g ? "var(--accent-dim)" : "transparent",
                    color: s.dailyGoal === g ? "var(--accent)" : "var(--text-secondary)",
                    borderRadius: "var(--radius-md)",
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    minWidth: 34,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <StatTile label="Journeys" value={s.lessonsCompleted} accent />
          <StatTile label="Quizzes passed" value={s.partsPassed} />
          <StatTile label="Perfect runs" value={s.perfectLessons} />
          <StatTile label="Languages" value={s.languagesUsed.length} />
          <StatTile label="Subjects" value={s.subjectsSeen.length} />
          <StatTile label="Follow-ups" value={s.followUps} />
        </div>

        {/* Heatmap */}
        <div style={{ marginTop: 18 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Activity</h4>
          <ActivityHeatmap history={s.history} />
        </div>

        {/* Achievements */}
        <div style={{ marginTop: 18 }}>
          <AchievementsGrid unlocked={s.badges} snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
}
