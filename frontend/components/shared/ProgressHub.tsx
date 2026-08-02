"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, dayKey } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";

function StreakIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="progress-hub__streak-icon">
      <path
        d="M9.584 1.322C9.827 3.08 9.303 4.155 8.126 5.303C7.194 6.212 6.667 7.207 6.667 8.52C6.667 10.554 8.311 12.2 10.333 12.2C12.355 12.2 14 10.554 14 8.52C14 5.859 12.6 3.727 9.584 1.322Z"
        fill="currentColor"
      />
      <path
        d="M5.183 5.236C5.327 6.298 5.005 6.96 4.274 7.674C3.71 8.224 3.4 8.823 3.4 9.608C3.4 10.865 4.417 11.883 5.667 11.883C6.917 11.883 7.933 10.865 7.933 9.608C7.933 7.98 7.076 6.663 5.183 5.236Z"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  );
}

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
        <span className={`progress-hub__streak${streak > 0 ? " progress-hub__streak--active" : ""}`}>
          <StreakIcon />
          <span className="progress-hub__streak-count">{streak}</span>
        </span>

        <span className="progress-hub__divider" aria-hidden="true" />

        <span className="progress-hub__ring">
          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            aria-hidden="true"
            className="progress-hub__ring-svg"
          >
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
              className="progress-hub__ring-progress"
            />
          </svg>
          <span className="progress-hub__level">{info.level}</span>
        </span>

        <span
          className={`progress-hub__daily${todayCount >= dailyGoal ? " progress-hub__daily--complete" : ""}`}
        >
          {todayCount >= dailyGoal ? "Goal met" : `${todayCount}/${dailyGoal} today`}
        </span>

        <span className="progress-hub__sr">{pct}%</span>
      </button>
    </>
  );
}

const ProgressHub = memo(ProgressHubImpl);
export default ProgressHub;
