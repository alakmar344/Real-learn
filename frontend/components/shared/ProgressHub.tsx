"use client";

import { useState } from "react";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { dayKey } from "@/lib/achievements";
import StatsPanel from "@/components/shared/StatsPanel";

/** Compact navbar widget: streak flame, level ring, daily-goal dots. Opens the
 * full StatsPanel on click. This is the persistent "growing self" the whole
 * engagement loop revolves around. */
export default function ProgressHub() {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);

  const xp = useProgressStore((s) => s.xp);
  const streak = useProgressStore((s) => s.streak);
  const dailyGoal = useProgressStore((s) => s.dailyGoal);
  const dailyCount = useProgressStore((s) => s.dailyCount);
  const dailyCountDay = useProgressStore((s) => s.dailyCountDay);

  const info = levelInfo(xp);
  const todayCount = mounted && dailyCountDay === dayKey() ? dailyCount : 0;
  const pct = Math.round(info.progress * 100);

  // Placeholder keeps navbar layout stable before hydration.
  if (!mounted) {
    return <div style={{ marginLeft: "auto", width: 118, height: 34 }} aria-hidden="true" />;
  }

  const ringSize = 34;
  const r = (ringSize - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - info.progress * c;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Level ${info.level}, ${streak} day streak, daily goal ${todayCount} of ${dailyGoal}. Open progress.`}
        title="Your progress"
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
          borderRadius: 999,
          padding: "4px 10px 4px 6px",
          cursor: "pointer",
          minHeight: 34,
        }}
      >
        {/* Streak */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <span className={streak > 0 ? "flame-flicker" : undefined} style={{ fontSize: 16, filter: streak > 0 ? "none" : "grayscale(1) opacity(0.6)" }}>
            🔥
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: streak > 0 ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {streak}
          </span>
        </span>

        <span style={{ width: 1, height: 18, background: "var(--border-subtle)" }} aria-hidden="true" />

        {/* Level ring */}
        <span style={{ position: "relative", width: ringSize, height: ringSize, display: "inline-block" }}>
          <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden="true">
            <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={3} />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              style={{ transition: "stroke-dashoffset 700ms var(--ease-reveal)" }}
            />
          </svg>
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--accent)",
            }}
          >
            {info.level}
          </span>
        </span>

        {/* Daily goal mini-progress (hidden on very small screens via title only) */}
        <span
          className="progress-hub-daily"
          style={{ fontSize: 11, color: todayCount >= dailyGoal ? "var(--correct)" : "var(--text-tertiary)", fontWeight: 700 }}
        >
          {todayCount >= dailyGoal ? "✓ goal" : `${todayCount}/${dailyGoal}`}
        </span>

        <span style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>{pct}%</span>
      </button>

      <StatsPanel open={open} onClose={() => setOpen(false)} />

      <style jsx>{`
        @media (max-width: 420px) {
          .progress-hub-daily {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
