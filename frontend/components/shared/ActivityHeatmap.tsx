import { dayKey } from "@/lib/achievements";
import { useTranslation } from "@/hooks/useTranslation";

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
  const { t } = useTranslation();
  const today = new Date();
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  // Anchor the grid to the Saturday that ENDS the current week so every
  // column is one real Sun–Sat calendar week (GitHub-style) — previously the
  // grid ended on "today", so each column mixed days from two weeks. Days
  // after today render as invisible placeholders to keep weekday rows fixed.
  const anchor = new Date(end);
  anchor.setDate(end.getDate() + (6 - end.getDay()));
  const totalDays = weeks * 7;

  const cells: { key: string; count: number; label: string; future: boolean }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const key = dayKey(d);
    const count = history[key] ?? 0;
    cells.push({
      key,
      count,
      label: t("progress.heatmapCell", { key, count, s: count === 1 ? "" : "s" }),
      future: d > end,
    });
  }

  // Column-major grid (each column = one week).
  const columns: (typeof cells)[] = [];
  for (let w = 0; w < weeks; w++) {
    columns.push(cells.slice(w * 7, w * 7 + 7));
  }

  const activeDays = cells.filter((c) => !c.future && c.count > 0).length;
  const totalParts = cells.reduce((sum, c) => (c.future ? sum : sum + c.count), 0);

  return (
    <div
      role="img"
      aria-label={t("progress.heatmapAria", {
        weeks,
        activeDays,
        totalParts,
      })}
    >
      <div aria-hidden="true" className="heatmap-scroll">
        {columns.map((col, ci) => (
          <div key={ci} className="activity-heatmap__col">
            {col.map((cell) => (
              <div
                key={cell.key}
                title={cell.future ? undefined : cell.label}
                className="activity-heatmap__cell"
                style={{
                  // Future days in the current week are blank spacers.
                  background: cell.future ? "transparent" : intensityColor(cell.count),
                  border: `1px solid ${cell.future ? "transparent" : "var(--border-subtle)"}`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="activity-heatmap__legend">
        <span>{t("progress.heatmapLess")}</span>
        {[0, 1, 2, 4, 6].map((n) => (
          <span
            key={n}
            className="activity-heatmap__legend-cell"
            style={{ background: intensityColor(n) }}
          />
        ))}
        <span>{t("progress.heatmapMore")}</span>
      </div>
    </div>
  );
}
