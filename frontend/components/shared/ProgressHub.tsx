"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, dayKey } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";

/** Compact navbar widget: streak flame, level ring, daily-goal dots. Navigates
 * to the full /progress dashboard on click. This is the persistent "growing
 * self" the whole engagement loop revolves around.
 *
 * Wrapped in React.memo so parent re-renders (e.g. Navbar toggling its own
 * state) don't cascade into re-rendering this widget — it only re-renders when
 * one of its five zustand selector fields actually changes. */
function ProgressHubImpl() {
  const mounted = useMounted();
  const router = useRouter();

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
        onClick={() => router.push("/progress")}
        aria-label={`Level ${info.level}, ${streak} day streak, daily goal ${todayCount} of ${dailyGoal}. Open progress.`}
        title="Your progress"
        className="progress-hub animate-fade-up"
        style={{ marginLeft: "auto" }}
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

const ProgressHub = memo(ProgressHubImpl);
export default ProgressHub;
