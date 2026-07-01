"use client";

import { dayKey } from "@/lib/achievements";

interface Props {
  history: Record<string, number>;
  weeks?: number;
}

function intensityColor(count: number): string {
  if (count <= 0) return "var(--border-subtle)";
  if (count === 1) return "color-mix(in srgb, var(--accent) 30%, transparent)";
  if (count === 2) return "color-mix(in srgb, var(--accent) 55%, transparent)";
  if (count <= 4) return "color-mix(in srgb, var(--accent) 78%, transparent)";
  return "var(--accent)";
}

/** GitHub-style contribution grid over the last N weeks (local dates). */
export default function ActivityHeatmap({ history, weeks = 14 }: Props) {
  const today = new Date();
  // Anchor to the most recent Saturday so columns are clean weeks.
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const totalDays = weeks * 7;

  const cells: { key: string; count: number; label: string }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = dayKey(d);
    const count = history[key] ?? 0;
    cells.push({ key, count, label: `${key}: ${count} part${count === 1 ? "" : "s"}` });
  }

  // Column-major grid (each column = one week).
  const columns: (typeof cells)[] = [];
  for (let w = 0; w < weeks; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
        {columns.map((col, ci) => (
          <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {col.map((cell) => (
              <div
                key={cell.key}
                title={cell.label}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: intensityColor(cell.count),
                  border: "1px solid var(--border-subtle)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
        <span>Less</span>
        {[0, 1, 2, 4, 6].map((n) => (
          <span
            key={n}
            style={{ width: 11, height: 11, borderRadius: 3, background: intensityColor(n), border: "1px solid var(--border-subtle)" }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
