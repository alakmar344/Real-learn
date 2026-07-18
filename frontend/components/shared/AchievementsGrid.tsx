"use client";

import { useEffect, useRef, useState } from "react";
import { BADGES, ProgressSnapshot, TIER_COLOR, BadgeTier } from "@/lib/achievements";

interface Props {
  unlocked: Record<string, number>;
  snapshot: ProgressSnapshot;
}

const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  legendary: "Legendary",
};

/** Grid of all achievements — earned ones lit, locked ones dimmed. Hovering
 * (or tapping, on touch) any badge opens a warm little card that explains
 * exactly how to earn it and how close you are. */
export default function AchievementsGrid({ unlocked, snapshot }: Props) {
  const earnedCount = BADGES.filter((b) => unlocked[b.id]).length;
  /** Badge id whose tooltip is pinned open by tap/click (touch devices). */
  const [openId, setOpenId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Tap-away closes the pinned tooltip (touch has no "mouse leave").
  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (e: PointerEvent) => {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [openId]);

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
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
          gap: 8,
        }}
      >
        {BADGES.map((badge) => {
          const earned = Boolean(unlocked[badge.id]);
          const progress = Math.round(badge.progress(snapshot) * 100);
          const isOpen = openId === badge.id;
          const tooltipId = `badge-tip-${badge.id}`;
          return (
            <button
              key={badge.id}
              type="button"
              className={`badge-tile${earned ? " badge-tile--earned" : ""}${isOpen ? " badge-tile--open" : ""}`}
              aria-describedby={tooltipId}
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : badge.id)}
              onBlur={() => setOpenId((cur) => (cur === badge.id ? null : cur))}
              style={{
                border: `1px solid ${earned ? TIER_COLOR[badge.tier] : "var(--border-subtle)"}`,
                background: earned ? "var(--bg-card)" : "var(--bg-surface)",
              }}
            >
              <div className="badge-tile__inner">
                <div style={{ fontSize: 26, filter: earned ? "none" : "grayscale(1)", lineHeight: 1.1, opacity: earned ? 1 : 0.72 }}>
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

              {/* Hover / tap tooltip — how to earn this badge */}
              <div className="badge-tooltip" role="tooltip" id={tooltipId}>
                <div className="badge-tooltip__header">
                  <span aria-hidden="true" style={{ fontSize: 18 }}>{badge.emoji}</span>
                  <span className="badge-tooltip__title">{badge.title}</span>
                  <span
                    className="badge-tooltip__tier"
                    style={{ color: TIER_COLOR[badge.tier], borderColor: TIER_COLOR[badge.tier] }}
                  >
                    {TIER_LABEL[badge.tier]}
                  </span>
                </div>
                <p className="badge-tooltip__how">
                  {earned ? badge.description : badge.how}
                </p>
                {earned ? (
                  <p className="badge-tooltip__status badge-tooltip__status--earned">
                    Earned — beautifully done. ✓
                  </p>
                ) : (
                  <div className="badge-tooltip__progress">
                    <div className="badge-tooltip__bar">
                      <div style={{ width: `${progress}%` }} />
                    </div>
                    <span>{progress}% there</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
