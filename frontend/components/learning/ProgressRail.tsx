"use client";

interface Props {
  unlockedPart: number;
  completedParts: number[];
  /** Total parts in this lesson — 1 for a quick answer, 3 for a full lesson. */
  totalParts?: number;
}

// Plain-language part names — everyone should instantly know what each step
// gives them (the old "Foundation / Mechanism / Real World" read like a
// textbook).
const PART_NAMES = ["The big idea", "How it works", "Where you see it"];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProgressRail({ unlockedPart, completedParts, totalParts = 3 }: Props) {
  /* ── Quick answer: a single direct answer ── */
  if (totalParts <= 1) {
    const done = completedParts.includes(1);
    return (
      <div
        role="status"
        aria-label={done ? "Answer complete" : "One clear answer"}
        className="rail-wrap rail-wrap--solo"
      >
        <span className={`journey-rail journey-rail--solo${done ? " is-done" : ""}`}>
          <span className="journey-rail__node" aria-hidden="true">
            {done ? <CheckIcon /> : <span className="journey-rail__pulse accent-pulse-dot" />}
          </span>
          {done ? "Answer complete" : "One clear answer"}
        </span>
      </div>
    );
  }

  const parts = Array.from({ length: totalParts }, (_, i) => i + 1);
  const completedCount = parts.filter((p) => completedParts.includes(p)).length;

  // Not a nav landmark: the rail has no links — like the quick-answer variant
  // it only reports progress, so both variants share the status role.
  // Nothing is ever locked: every part is readable from the start, so the
  // rail simply shows done / reading now / up next.
  return (
    <div
      role="status"
      aria-label="Lesson progress"
      className="rail-wrap rail-wrap--steps"
    >
      <div className="journey-rail">
        <ol
          role="list"
          aria-label={`${completedCount} of ${totalParts} parts done`}
          className="journey-rail__steps"
        >
          {parts.map((part) => {
            const done = completedParts.includes(part);
            const active = !done && part <= unlockedPart;
            const statusLabel = done ? "done" : active ? "reading now" : "up next";

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
                  {done ? <CheckIcon /> : part}
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
    </div>
  );
}
