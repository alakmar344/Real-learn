"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, dayKey, displayableStreak } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { Icon } from "@/components/shared/icons";

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
  const rawStreak = useProgressStore((s) => s.streak);
  const lastActiveDay = useProgressStore((s) => s.lastActiveDay);
  const streakFreezes = useProgressStore((s) => s.streakFreezes);
  const dailyGoal = useProgressStore((s) => s.dailyGoal);
  const dailyCount = useProgressStore((s) => s.dailyCount);
  const dailyCountDay = useProgressStore((s) => s.dailyCountDay);

  const info = levelInfo(xp);
  // Render the streak through the lapse check — the raw persisted value stays
  // "alive" forever after the user stops coming back (see displayableStreak).
  const streak = mounted
    ? displayableStreak(rawStreak, lastActiveDay, streakFreezes)
    : 0;
  const todayCount = mounted && dailyCountDay === dayKey() ? dailyCount : 0;
  const pct = Math.round(info.progress * 100);

  // Placeholder keeps navbar layout stable before hydration.
  if (!mounted) {
    return <div className="progress-hub-placeholder" aria-hidden="true" />;
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
      >
        {/* Streak */}
        <span className="progress-hub__streak">
          <span className={`progress-hub__flame${streak > 0 ? " flame-flicker" : " flame--dead"}`}>
            <Icon name="flame" size={16} />
          </span>
          <span className={`progress-hub__count${streak > 0 ? "" : " progress-hub__count--zero"}`}>
            {streak}
          </span>
        </span>

        <span className="progress-hub__divider" aria-hidden="true" />

        {/* Level ring */}
        <span className="progress-hub__ring">
          <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden="true">
            <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={3} />
            <circle
              className="progress-hub__ring-arc"
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
            />
          </svg>
          <span className="progress-hub__ring-level">{info.level}</span>
        </span>

        {/* Daily goal mini-progress (hidden on very small screens in globals.css) */}
        <span
          className={`progress-hub__daily${todayCount >= dailyGoal ? " progress-hub__daily--met" : ""}`}
        >
          {todayCount >= dailyGoal ? (
            <>
              <Icon name="check" size={11} /> goal
            </>
          ) : (
            `${todayCount}/${dailyGoal}`
          )}
        </span>

        <span className="sr-only">{pct}%</span>
      </button>
    </>
  );
}

const ProgressHub = memo(ProgressHubImpl);
export default ProgressHub;
