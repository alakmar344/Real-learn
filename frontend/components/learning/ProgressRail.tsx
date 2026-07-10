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

  if (done) return <span aria-hidden="true" style={{ color: "white", fontSize: 18, fontWeight: 700 }}>✓</span>;
  if (active) return <span style={{ color: "var(--on-accent)", fontWeight: 800, fontSize: 16 }}>{part}</span>;
  return <span aria-hidden="true" style={{ color: "var(--text-tertiary)", fontSize: 16 }}>🔒</span>;
}

export default function ProgressRail({ unlockedPart, completedParts, totalParts = 3 }: Props) {
  /* ── Fast mode: a single direct answer — show a light badge, not a rail ── */
  if (totalParts <= 1) {
    const done = completedParts.includes(1);
    return (
      <div
        role="status"
        aria-label={done ? "Quick answer mastered" : "Fast mode – one quick answer"}
        style={{
          marginTop: varSpaceXl,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: done ? "var(--correct)" : "var(--accent)",
            background: done ? "var(--correct-bg)" : "var(--accent-dim)",
            border: `1.5px solid ${done ? "var(--correct)" : "var(--accent)"}`,
            boxShadow: "none",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 16 }}>{done ? "✓" : "⚡"}</span>
          {done ? "Quick answer mastered" : "Fast mode — one quick answer"}
        </span>
      </div>
    );
  }

  const parts = Array.from({ length: totalParts }, (_, i) => i + 1);
  const completedCount = parts.filter((p) => completedParts.includes(p)).length;

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
      <ol
        role="list"
        aria-label={`${completedCount} of ${totalParts} parts completed`}
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {parts.map((part, index) => {
          const done = completedParts.includes(part);
          const active = !done && part <= unlockedPart;
          const locked = !done && !active;

          const statusLabel = done ? "completed" : active ? "current part" : "locked";

          return (
            <li
              key={part}
              role="listitem"
              aria-label={`Part ${part}: ${statusLabel}`}
              style={{ display: "flex", alignItems: "center", flex: 1 }}
            >
              <div style={{ display: "grid", placeItems: "center", minWidth: 44 }}>
                <div
                  className={active ? "animate-unlock-pop" : undefined}
                  aria-hidden="true"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: done ? "var(--correct)" : active ? "var(--accent)" : "var(--bg-card)",
                    border: locked ? "2px solid var(--border-default)" : "none",
                    boxShadow: done
                      ? "none"
                      : active
                        ? "var(--shadow-sm)"
                        : "none",
                    backgroundSize: "200% 200%",
                    animation: undefined,
                  }}
                >
                  <NodeIcon part={part} unlockedPart={unlockedPart} completedParts={completedParts} />
                </div>
                <span
                  aria-hidden="true"
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    fontWeight: 600,
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
                    height: 3,
                    flexGrow: 1,
                    margin: "0 10px 18px",
                    borderRadius: 2,
                    background: done ? "var(--correct)" : "var(--border-default)",
                    transition: "background 350ms var(--ease-color)",
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const varSpaceXl = "var(--space-xl)";
