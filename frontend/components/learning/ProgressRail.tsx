"use client";

interface Props {
  unlockedPart: number;
  completedParts: number[];
  /** Total parts in this journey — 1 for fast mode, 3 for explain mode. */
  totalParts?: number;
}

const PART_NAMES = ["Foundation", "Mechanism", "Real World"];

export default function ProgressRail({ unlockedPart, completedParts, totalParts = 3 }: Props) {
  /* ── Fast mode: a single direct answer ── */
  if (totalParts <= 1) {
    const done = completedParts.includes(1);
    return (
      <div
        role="status"
        aria-label={done ? "Quick answer mastered" : "Fast mode – one quick answer"}
        style={{
          marginTop: "var(--space-lg)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            borderRadius: "var(--radius-pill)",
            fontSize: 13,
            fontWeight: 700,
            color: done ? "var(--correct)" : "var(--accent)",
            background: done ? "var(--correct-bg)" : "var(--accent-dim)",
            border: `1.5px solid ${done ? "var(--correct)" : "var(--accent)"}`,
          }}
        >
          <span>{done ? "✓" : "•"}</span>
          {done ? "Quick answer mastered" : "Fast mode — direct explanation"}
        </span>
      </div>
    );
  }

  const parts = Array.from({ length: totalParts }, (_, i) => i + 1);
  const completedCount = parts.filter((p) => completedParts.includes(p)).length;

  return (
    <nav
      aria-label="Learning progress conduit"
      style={{
        marginTop: "var(--space-lg)",
        maxWidth: 520,
        marginInline: "auto",
        padding: "0 12px",
      }}
    >
      <ol
        role="list"
        aria-label={`${completedCount} of ${totalParts} parts completed`}
        className="learning-conduit"
      >
        {parts.map((part) => {
          const done = completedParts.includes(part);
          const active = !done && part <= unlockedPart;
          const statusLabel = done ? "completed" : active ? "current active part" : "locked";

          return (
            <li
              key={part}
              role="listitem"
              aria-label={`Part ${part} (${PART_NAMES[part - 1] ?? `Part ${part}`}): ${statusLabel}`}
              className={`learning-conduit__step${
                done
                  ? " learning-conduit__step--completed"
                  : active
                  ? " learning-conduit__step--active"
                  : ""
              }`}
            >
              <span>{done ? "✓" : active ? "▶" : "🔒"}</span>
              <span>
                Part {part}: {PART_NAMES[part - 1] ?? `Part ${part}`}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


