"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** Padding (px) between the popover and the badge / viewport edge. */
const POPOVER_GAP = 10;
const POPOVER_VIEWPORT_MARGIN = 8;

/** Position of the floating popover, in fixed viewport coordinates. */
interface PopoverPos {
  top: number;
  left: number;
  /** Whether the popover sits below the badge (true) or above it (false). */
  below: boolean;
  /** Arrow horizontal offset from the popover's left edge (px). */
  arrowLeft: number;
}

/** Grid of all achievements — earned ones lit, locked ones dimmed. Clicking
 * (or hovering, on desktop) any badge opens a popover card that explains
 * exactly how to earn it and how close you are.
 *
 * The popover is rendered as a SINGLE `position: fixed` element at the
 * component root — NOT inside each badge tile. This is critical: the grid's
 * ancestor (`.progress-achievements`) uses `content-visibility: auto`, which
 * applies paint containment and would clip any absolutely-positioned tooltip
 * that extends beyond the grid's box. A fixed-position popover is positioned
 * relative to the viewport, so it can never be clipped by an overflowing or
 * paint-contained ancestor. */
export default function AchievementsGrid({ unlocked, snapshot }: Props) {
  const earnedCount = BADGES.filter((b) => unlocked[b.id]).length;
  /** Badge id whose popover is pinned open by tap/click. */
  const [openId, setOpenId] = useState<string | null>(null);
  const [badgeRect, setBadgeRect] = useState<DOMRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const openBadge = useCallback((badgeId: string) => {
    // Find the badge tile button in the DOM and measure it.
    const tile = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-badge-id="${badgeId}"]`
    );
    if (!tile) return;
    const rect = tile.getBoundingClientRect();
    // We don't know the popover height until it renders, so we measure
    // after paint in the layout effect below. For now, store the badge
    // rect so we can compute the final position once the popover mounts.
    setBadgeRect(rect);
    setOpenId(badgeId);
  }, []);

  // After the popover mounts (openId set), measure it and compute a clamped
  // position that keeps it fully inside the viewport.
  useLayoutEffect(() => {
    if (!openId || !badgeRect || !popoverRef.current) {
      setPopoverPos(null);
      return;
    }
    const pop = popoverRef.current;
    const popRect = pop.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer above the badge; flip below if there isn't enough room.
    const spaceAbove = badgeRect.top;
    const spaceBelow = vh - badgeRect.bottom;
    const below = spaceAbove < popRect.height + POPOVER_GAP + POPOVER_VIEWPORT_MARGIN
      && spaceBelow >= spaceAbove;

    // Vertical position.
    let top: number;
    if (below) {
      top = badgeRect.bottom + POPOVER_GAP;
    } else {
      top = badgeRect.top - popRect.height - POPOVER_GAP;
    }
    // Clamp to viewport.
    top = Math.max(
      POPOVER_VIEWPORT_MARGIN,
      Math.min(top, vh - popRect.height - POPOVER_VIEWPORT_MARGIN)
    );

    // Horizontal: center on the badge, then clamp to viewport.
    const desiredLeft = badgeRect.left + badgeRect.width / 2 - popRect.width / 2;
    const left = Math.max(
      POPOVER_VIEWPORT_MARGIN,
      Math.min(desiredLeft, vw - popRect.width - POPOVER_VIEWPORT_MARGIN)
    );

    // Arrow horizontal offset: point at the badge centre relative to the
    // popover's left edge. Clamped so the arrow never sits at the extreme
    // edge of the popover (keeps it visually anchored).
    const arrowLeft = badgeRect.left + badgeRect.width / 2 - left;
    const clampedArrowLeft = Math.max(16, Math.min(arrowLeft, popRect.width - 16));

    setPopoverPos({ top, left, below, arrowLeft: clampedArrowLeft });
  }, [openId, badgeRect]);

  // Close on scroll (the badge positions change, so the arrow would point
  // at the wrong spot) and on viewport resize.
  useEffect(() => {
    if (!openId) return;
    const close = () => setOpenId(null);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openId]);

  // Tap-away / Escape closes the popover.
  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        gridRef.current?.contains(target)
      ) {
        return; // click inside the grid or popover — let onClick handle it
      }
      setOpenId(null);
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

  const openBadgeData = openId ? BADGES.find((b) => b.id === openId) : null;

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
              data-badge-id={badge.id}
              className={`badge-tile${earned ? " badge-tile--earned" : ""}${isOpen ? " badge-tile--open" : ""}`}
              aria-describedby={tooltipId}
              aria-expanded={isOpen}
              onClick={() => (isOpen ? setOpenId(null) : openBadge(badge.id))}
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
            </button>
          );
        })}
      </div>

      {/* ── Floating popover ── rendered at the component root (outside the
          grid), positioned fixed relative to the viewport so it can never be
          clipped by an ancestor's paint containment or overflow. */}
      {openBadgeData && (
        <div
          ref={popoverRef}
          className="badge-popover"
          role="tooltip"
          id={openBadgeData ? `badge-tip-${openBadgeData.id}` : undefined}
          style={
            popoverPos
              ? {
                  top: popoverPos.top,
                  left: popoverPos.left,
                  opacity: 1,
                  transform: "translateY(0) scale(1)",
                  pointerEvents: "auto",
                  visibility: "visible",
                }
              : {
                  top: -9999,
                  left: -9999,
                  opacity: 0,
                  visibility: "hidden",
                  pointerEvents: "none",
                }
          }
        >
          {/* Arrow pointing at the badge — only shown once positioned. */}
          {popoverPos && (
            <span
              className="badge-popover__arrow"
              style={{
                left: popoverPos.arrowLeft,
                ...(popoverPos.below
                  ? {
                      bottom: "100%",
                      borderBottomColor: "var(--border-default)",
                    }
                  : {
                      top: "100%",
                      borderTopColor: "var(--border-default)",
                    }),
              }}
            />
          )}
          <div className="badge-popover__header">
            <span aria-hidden="true" style={{ fontSize: 18 }}>{openBadgeData.emoji}</span>
            <span className="badge-popover__title">{openBadgeData.title}</span>
            <span
              className="badge-popover__tier"
              style={{ color: TIER_COLOR[openBadgeData.tier], borderColor: TIER_COLOR[openBadgeData.tier] }}
            >
              {TIER_LABEL[openBadgeData.tier]}
            </span>
          </div>
          <p className="badge-popover__how">
            {unlocked[openBadgeData.id] ? openBadgeData.description : openBadgeData.how}
          </p>
          {unlocked[openBadgeData.id] ? (
            <p className="badge-popover__status badge-popover__status--earned">
              Earned — beautifully done. ✓
            </p>
          ) : (
            <div className="badge-popover__progress">
              <div className="badge-popover__bar">
                <div style={{ width: `${Math.round(openBadgeData.progress(snapshot) * 100)}%` }} />
              </div>
              <span>{Math.round(openBadgeData.progress(snapshot) * 100)}% there</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
