"use client";

interface Props {
  unlockedPart: number;
  completedParts: number[];
  /** Total parts in this journey — 1 for fast mode, 3 for explain mode. */
  totalParts?: number;
}

function NodeIcon({ part, unlockedPart, completedParts }: { part: number; unlockedPart: number; completedParts: number[] }) {
  const done = completedParts.includes(part);
  const active = !done && part <= unlockedPart;

  if (done) return <span aria-hidden="true" style={{ color: "white", fontSize: 16 }}>✓</span>;
  if (active) return <span style={{ color: "var(--bg-primary)", fontWeight: 700 }}>{part}</span>;
  return <span aria-hidden="true" style={{ color: "var(--text-tertiary)", fontSize: 14 }}>🔒</span>;
}

export default function ProgressRail({ unlockedPart, completedParts, totalParts = 3 }: Props) {
  /* ── Fast mode: a single direct answer — show a light badge, not a rail ── */
  if (totalParts <= 1) {
    const done = completedParts.includes(1);
    return (
      <div
        aria-label="Quick answer mode"
        style={{
          marginTop: varSpaceXl,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: done ? "var(--correct)" : "var(--accent)",
            background: done ? "var(--correct-bg)" : "var(--accent-dim)",
            border: `1px solid ${done ? "var(--correct)" : "var(--accent)"}`,
          }}
        >
          <span aria-hidden="true">{done ? "✓" : "⚡"}</span>
          {done ? "Quick answer mastered" : "Fast mode — one quick answer"}
        </span>
      </div>
    );
  }

  const parts = Array.from({ length: totalParts }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Learning progress"
      style={{
        marginTop: varSpaceXl,
        maxWidth: 400,
        marginInline: "auto",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      {parts.map((part, index) => {
        const done = completedParts.includes(part);
        const active = !done && part <= unlockedPart;
        const locked = !done && !active;

        const statusLabel = done ? "completed" : active ? "current" : "locked";

        return (
          <div
            key={part}
            style={{ display: "flex", alignItems: "center", flex: 1 }}
          >
            <div style={{ display: "grid", placeItems: "center", minWidth: 40 }}>
              <div
                className={active ? "animate-unlock-pop" : undefined}
                role="listitem"
                aria-label={`Part ${part} – ${statusLabel}`}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: done ? "var(--correct)" : active ? "var(--accent)" : "var(--bg-card)",
                  border: locked ? "1.5px solid var(--border-default)" : "none",
                  boxShadow: done
                    ? "var(--shadow-glow-correct)"
                    : active
                      ? "var(--shadow-glow-accent)"
                      : "none",
                }}
              >
                <NodeIcon part={part} unlockedPart={unlockedPart} completedParts={completedParts} />
              </div>
              <span
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  color: done ? "var(--correct)" : active ? "var(--accent)" : "var(--text-tertiary)",
                }}
              >
                Part {part}
              </span>
            </div>
            {index < parts.length - 1 ? (
              <div
                aria-hidden="true"
                style={{
                  height: 2,
                  flexGrow: 1,
                  margin: "0 8px 16px",
                  background: done ? "var(--correct)" : "var(--border-default)",
                  transition: "background 350ms var(--ease-color)",
                }}
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

const varSpaceXl = "var(--space-xl)";
