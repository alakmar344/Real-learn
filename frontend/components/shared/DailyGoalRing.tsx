"use client";

interface Props {
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
  /** Show the flame + count in the middle. */
  showLabel?: boolean;
}

/** A circular progress ring for the daily learning goal. */
export default function DailyGoalRing({
  value,
  goal,
  size = 44,
  stroke = 4,
  showLabel = true,
}: Props) {
  const safeGoal = Math.max(1, goal);
  const pct = Math.max(0, Math.min(1, value / safeGoal));
  const met = value >= safeGoal;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - pct * c;

  return (
    <div
      role="img"
      aria-label={`${value} of ${goal} daily parts completed`}
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={met ? "var(--correct)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 700ms var(--ease-reveal), stroke 300ms var(--ease-color)" }}
        />
      </svg>
      {showLabel && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontSize: size * 0.3,
            fontWeight: 700,
            color: met ? "var(--correct)" : "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {met ? "✓" : `${value}/${safeGoal}`}
        </div>
      )}
    </div>
  );
}
