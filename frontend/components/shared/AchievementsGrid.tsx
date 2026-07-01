"use client";

import { BADGES, ProgressSnapshot, TIER_COLOR } from "@/lib/achievements";

interface Props {
  unlocked: Record<string, number>;
  snapshot: ProgressSnapshot;
}

/** Grid of all achievements — earned ones lit, locked ones dimmed with a
 * progress hint so there's always one "almost there". */
export default function AchievementsGrid({ unlocked, snapshot }: Props) {
  const earnedCount = BADGES.filter((b) => unlocked[b.id]).length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Achievements</h4>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {earnedCount}/{BADGES.length} unlocked
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
          gap: 8,
        }}
      >
        {BADGES.map((badge) => {
          const earned = Boolean(unlocked[badge.id]);
          const progress = Math.round(badge.progress(snapshot) * 100);
          return (
            <div
              key={badge.id}
              title={`${badge.title} — ${badge.description}${earned ? "" : ` (${progress}%)`}`}
              style={{
                position: "relative",
                borderRadius: "var(--radius-lg)",
                border: `1px solid ${earned ? TIER_COLOR[badge.tier] : "var(--border-subtle)"}`,
                background: earned ? "var(--bg-card)" : "var(--bg-surface)",
                padding: "10px 8px",
                textAlign: "center",
                opacity: earned ? 1 : 0.72,
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 26, filter: earned ? "none" : "grayscale(1)", lineHeight: 1.1 }}>
                {badge.emoji}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 4,
                  color: earned ? "var(--text-primary)" : "var(--text-tertiary)",
                  lineHeight: 1.2,
                }}
              >
                {badge.title}
              </div>
              {!earned && (
                <div style={{ marginTop: 6, height: 3, borderRadius: 3, background: "var(--border-subtle)", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width 500ms var(--ease-reveal)" }} />
                </div>
              )}
              {earned && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 6,
                    fontSize: 10,
                    color: TIER_COLOR[badge.tier],
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
