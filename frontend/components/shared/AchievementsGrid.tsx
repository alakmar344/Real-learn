import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BADGES, ProgressSnapshot, TIER_COLOR, BadgeTier } from "@/lib/achievements";
import { Icon } from "@/components/shared/icons";
import { useTranslation } from "@/hooks/useTranslation";
import { TranslationKey } from "@/lib/i18n";

interface Props {
  unlocked: Record<string, number>;
  snapshot: ProgressSnapshot;
}

const TIER_TRANSLATION_KEYS: Record<BadgeTier, TranslationKey> = {
  bronze: "achievements.tier.bronze",
  silver: "achievements.tier.silver",
  gold: "achievements.tier.gold",
  legendary: "achievements.tier.legendary",
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

export default function AchievementsGrid({ unlocked, snapshot }: Props) {
  const { t } = useTranslation();
  // Derive every badge's earned/progress state ONCE per data change. Without
  // the memo the full set of progress() callbacks re-ran on every render —
  // and the popover open/close state changes on every hover across the grid.
  const badgeStates = useMemo(
    () =>
      BADGES.map((badge) => ({
        badge,
        earned: Boolean(unlocked[badge.id]),
        progress: Math.round(badge.progress(snapshot) * 100),
      })),
    [unlocked, snapshot]
  );
  const earnedCount = useMemo(
    () => badgeStates.reduce((n, s) => n + (s.earned ? 1 : 0), 0),
    [badgeStates]
  );
  /** Badge id whose popover is pinned open by tap/click. */
  const [openId, setOpenId] = useState<string | null>(null);
  const [badgeRect, setBadgeRect] = useState<DOMRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  /** True when the open popover was pinned by click/tap (hover won't close it). */
  const pinnedRef = useRef(false);
  /** Grace timer so the pointer can travel from tile → popover without it closing. */
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Portals need a client DOM — track mount so SSR markup stays identical. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimer.current !== null) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback((badgeId: string) => {
    cancelHoverClose();
    hoverCloseTimer.current = setTimeout(() => {
      hoverCloseTimer.current = null;
      if (!pinnedRef.current) {
        setOpenId((cur) => (cur === badgeId ? null : cur));
      }
    }, 140);
  }, [cancelHoverClose]);

  // Never leave a timer running past unmount.
  useEffect(() => cancelHoverClose, [cancelHoverClose]);

  const openBadge = useCallback((badgeId: string) => {
    // Find the badge tile button in the DOM and measure it.
    const tile = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-badge-id="${badgeId}"]`
    );
    if (!tile) return;
    const rect = tile.getBoundingClientRect();
    setBadgeRect(rect);
    setOpenId(badgeId);
  }, []);

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

    // Arrow horizontal offset.
    const arrowLeft = badgeRect.left + badgeRect.width / 2 - left;
    const clampedArrowLeft = Math.max(16, Math.min(arrowLeft, popRect.width - 16));

    setPopoverPos({ top, left, below, arrowLeft: clampedArrowLeft });
  }, [openId, badgeRect]);

  // Close on scroll and on viewport resize.
  useEffect(() => {
    if (!openId) return;
    const close = () => {
      pinnedRef.current = false;
      setOpenId(null);
    };
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
        return;
      }
      pinnedRef.current = false;
      setOpenId(null);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pinnedRef.current = false;
        setOpenId(null);
      }
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
      <div className="achievements-header">
        <h2 className="achievements-header__title">{t("achievements.title")}</h2>
        <span className="achievements-header__count">
          {t("achievements.unlockedCount", { unlocked: earnedCount, total: BADGES.length })}
        </span>
      </div>

      <div ref={gridRef} className="achievements-grid">
        {badgeStates.map(({ badge, earned, progress }) => {
          const isOpen = openId === badge.id;
          const tooltipId = `badge-tip-${badge.id}`;
          return (
            <button
              key={badge.id}
              type="button"
              data-badge-id={badge.id}
              className={`badge-tile${earned ? " badge-tile--earned" : ""}${isOpen ? " badge-tile--open" : ""}`}
              aria-describedby={isOpen ? tooltipId : undefined}
              aria-expanded={isOpen}
              onClick={() => {
                if (isOpen && pinnedRef.current) {
                  pinnedRef.current = false;
                  setOpenId(null);
                } else {
                  pinnedRef.current = true;
                  openBadge(badge.id);
                }
              }}
              onMouseEnter={() => {
                cancelHoverClose();
                if (!pinnedRef.current) openBadge(badge.id);
              }}
              onMouseLeave={() => {
                if (!pinnedRef.current) scheduleHoverClose(badge.id);
              }}
              onBlur={() => {
                pinnedRef.current = false;
                setOpenId((cur) => (cur === badge.id ? null : cur));
              }}
              style={{
                border: `1px solid ${earned ? TIER_COLOR[badge.tier] : "var(--border-subtle)"}`,
                background: earned ? "var(--bg-card)" : "var(--bg-surface)",
              }}
            >
              <div className="badge-tile__inner">
                <div
                  className="badge-tile__icon"
                  style={{
                    color: earned ? TIER_COLOR[badge.tier] : "var(--text-tertiary)",
                    opacity: earned ? 1 : 0.72,
                  }}
                >
                  <Icon name={badge.icon} size={26} />
                </div>
                <div
                  className="badge-tile__title"
                  style={{
                    color: earned ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {badge.title}
                </div>
                {!earned && (
                  <div className="badge-tile__track">
                    <div className="badge-tile__fill" style={{ width: `${progress}%` }} />
                  </div>
                )}
                {earned && (
                  <div
                    aria-hidden="true"
                    className="badge-tile__check"
                    style={{
                      color: TIER_COLOR[badge.tier],
                    }}
                  >
                    <Icon name="check" size={10} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {mounted && openBadgeData && createPortal(
        <div
          ref={popoverRef}
          className="badge-popover"
          role="tooltip"
          id={openBadgeData ? `badge-tip-${openBadgeData.id}` : undefined}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={() => {
            if (!pinnedRef.current && openBadgeData) scheduleHoverClose(openBadgeData.id);
          }}
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
            <span
              aria-hidden="true"
              style={{ display: "inline-flex", color: TIER_COLOR[openBadgeData.tier] }}
            >
              <Icon name={openBadgeData.icon} size={18} />
            </span>
            <span className="badge-popover__title">{openBadgeData.title}</span>
            <span
              className="badge-popover__tier"
              style={{ color: TIER_COLOR[openBadgeData.tier], borderColor: TIER_COLOR[openBadgeData.tier] }}
            >
              {t(TIER_TRANSLATION_KEYS[openBadgeData.tier])}
            </span>
          </div>
          <p className="badge-popover__how">
            {unlocked[openBadgeData.id] ? openBadgeData.description : openBadgeData.how}
          </p>
          {unlocked[openBadgeData.id] ? (
            <p className="badge-popover__status badge-popover__status--earned">
              {t("achievements.earnedDone")}{" "}
              <Icon name="check" size={12} style={{ verticalAlign: "-2px" }} />
            </p>
          ) : (
            <div className="badge-popover__progress">
              <div className="badge-popover__bar">
                <div style={{ width: `${Math.round(openBadgeData.progress(snapshot) * 100)}%` }} />
              </div>
              <span>{t("achievements.pctThere", { pct: Math.round(openBadgeData.progress(snapshot) * 100) })}</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
