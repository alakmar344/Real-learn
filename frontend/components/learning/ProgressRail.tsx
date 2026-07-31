"use client";

interface Props {
  unlockedPart: number;
  completedParts: number[];
  /** Total parts in this journey — 1 for fast mode, 3 for explain mode. */
  totalParts?: number;
}

const PART_NAMES = ["Foundation", "Mechanism", "Real World"];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7.8C8 5.6 9.8 4 12 4s4 1.6 4 3.8V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ProgressRail({ unlockedPart, completedParts, totalParts = 3 }: Props) {
  /* ── Fast mode: a single direct answer ── */
  if (totalParts <= 1) {
    const done = completedParts.includes(1);
    return (
      <div
        role="status"
        aria-label={done ? "Quick answer mastered" : "Fast mode – one quick answer"}
        style={{ marginTop: "var(--space-lg)", display: "flex", justifyContent: "center" }}
      >
        <span className={`journey-rail journey-rail--solo${done ? " is-done" : ""}`}>
          <span className="journey-rail__node" aria-hidden="true">
            {done ? <CheckIcon /> : <span className="accent-pulse-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor" }} />}
          </span>
          {done ? "Quick answer mastered" : "Fast mode — direct explanation"}
        </span>
      </div>
    );
  }

  const parts = Array.from({ length: totalParts }, (_, i) => i + 1);
  const completedCount = parts.filter((p) => completedParts.includes(p)).length;

  return (
    <nav
      aria-label="Learning progress"
      style={{ marginTop: "var(--space-lg)", maxWidth: 580, marginInline: "auto", padding: "0 12px" }}
    >
      <div className="journey-rail">
        <ol
          role="list"
          aria-label={`${completedCount} of ${totalParts} parts completed`}
          className="journey-rail__steps"
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
                className={`journey-rail__step${
                  done ? " journey-rail__step--completed" : active ? " journey-rail__step--active" : ""
                }`}
              >
                {part > 1 ? (
                  <span
                    className={`journey-rail__connector${part <= unlockedPart ? " is-filled" : ""}`}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="journey-rail__node" aria-hidden="true">
                  {done ? <CheckIcon /> : active ? part : <LockIcon />}
                </span>
                <span className="journey-rail__step-text">
                  <span className="journey-rail__step-prefix">Part {part}: </span>
                  <span>{PART_NAMES[part - 1] ?? `Part ${part}`}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
