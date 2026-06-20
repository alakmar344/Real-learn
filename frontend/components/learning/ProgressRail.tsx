"use client";

interface Props {
  unlockedPart: 1 | 2 | 3;
  completedParts: number[];
}

function NodeIcon({ part, unlockedPart, completedParts }: { part: 1 | 2 | 3; unlockedPart: 1 | 2 | 3; completedParts: number[] }) {
  const done = completedParts.includes(part);
  const active = !done && part <= unlockedPart;

  if (done) return <span aria-hidden="true" style={{ color: "white", fontSize: 16 }}>✓</span>;
  if (active) return <span style={{ color: "var(--bg-primary)", fontWeight: 700 }}>{part}</span>;
  return <span aria-hidden="true" style={{ color: "var(--text-tertiary)", fontSize: 14 }}>🔒</span>;
}

export default function ProgressRail({ unlockedPart, completedParts }: Props) {
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
      {[1, 2, 3].map((part, index) => {
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
                <NodeIcon part={part as 1 | 2 | 3} unlockedPart={unlockedPart} completedParts={completedParts} />
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
            {index < 2 ? (
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
