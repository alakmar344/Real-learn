"use client";

import { useEffect, useRef, useState } from "react";
import { useProgressStore, Celebration } from "@/store/progressStore";
import { BADGE_BY_ID, TIER_COLOR, levelTitle } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { Icon, type IconName } from "@/components/shared/icons";

/* Duration each celebration type stays on screen.
   Reduced from original values to minimize user interruption — celebrations
   should feel like quick, delightful feedback, not blocking overlays. */
const DURATION: Record<Celebration["kind"], number> = {
  xp: 800,
  "level-up": 2500,
  badge: 2500,
  streak: 2000,
  "daily-goal": 2000,
};

/** Small non-blocking XP chip that floats up near the top. */
function XpChip({ label }: { label: string }) {
  return (
    <div className="celebration-chip-wrap">
      <div className="animate-xp-pop celebration-chip">{label}</div>
    </div>
  );
}

function CenterCard({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const dismissRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dismissRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className="animate-overlay-fade celebration-scrim"
    >
      <div className="animate-level-burst celebration-card">
        {children}
        <button
          ref={dismissRef}
          type="button"
          onClick={onDismiss}
          className="celebration-card__dismiss"
        >
          Tap to continue
        </button>
      </div>
    </div>
  );
}

/* ── Batched celebration summary card ── */

/** Priority order: higher = more important, shown as the hero. */
const CELEBRATION_PRIORITY: Record<Celebration["kind"], number> = {
  "level-up": 5,
  badge: 4,
  "daily-goal": 3,
  streak: 2,
  xp: 1,
};

interface BatchSummary {
  /** The single most important celebration — drives the hero icon/title. */
  hero: Celebration;
  /** All celebrations in the batch, deduplicated. */
  all: Celebration[];
  /** Total XP earned across all xp-type celebrations. */
  totalXp: number;
  /** Number of badges unlocked. */
  badgeCount: number;
  /** Whether a level-up happened. */
  leveledUp: boolean;
  /** Whether a streak was extended. */
  streakExtended: boolean;
  /** Whether daily goal was met. */
  dailyGoalMet: boolean;
}

function summarizeBatch(queue: Celebration[]): BatchSummary | null {
  if (queue.length === 0) return null;

  // Find the hero (highest priority)
  let hero = queue[0];
  for (const item of queue) {
    if ((CELEBRATION_PRIORITY[item.kind] ?? 0) > (CELEBRATION_PRIORITY[hero.kind] ?? 0)) {
      hero = item;
    }
  }

  const totalXp = queue
    .filter((c): c is Extract<Celebration, { kind: "xp" }> => c.kind === "xp")
    .reduce((sum, c) => sum + c.amount, 0);

  const badgeCount = queue.filter((c) => c.kind === "badge").length;
  const leveledUp = queue.some((c) => c.kind === "level-up");
  const streakExtended = queue.some((c) => c.kind === "streak");
  const dailyGoalMet = queue.some((c) => c.kind === "daily-goal");

  return { hero, all: queue, totalXp, badgeCount, leveledUp, streakExtended, dailyGoalMet };
}

function BatchCelebrationCard({
  summary,
  onDismiss,
}: {
  summary: BatchSummary;
  onDismiss: () => void;
}) {
  const { hero, totalXp, badgeCount, leveledUp, streakExtended, dailyGoalMet } = summary;

  // Build the hero icon based on the most important event
  let heroIcon: IconName = "sparkle";
  let heroColor: string | undefined;
  let heroTitle = "Great work!";
  let heroSub = "";

  if (hero.kind === "level-up") {
    heroIcon = "star";
    heroTitle = `Level ${hero.level}!`;
    heroSub = `You're now a ${levelTitle(hero.level)}.`;
  } else if (hero.kind === "badge") {
    const badge = BADGE_BY_ID[hero.badgeId];
    heroIcon = badge?.icon ?? "trophy";
    heroColor = TIER_COLOR[badge?.tier ?? "bronze"];
    heroTitle = badge?.title ?? "Achievement unlocked!";
    heroSub = badge?.description ?? "";
  } else if (hero.kind === "daily-goal") {
    heroIcon = "target";
    heroTitle = "Daily goal complete!";
    heroSub = `${hero.goal} parts studied today.`;
  } else if (hero.kind === "streak") {
    heroIcon = "flame";
    heroTitle = `${hero.streak}-day streak!`;
    heroSub = "Come back tomorrow to keep it alive.";
  } else {
    heroIcon = "sparkle";
    heroTitle = "Nice work!";
    heroSub = "";
  }

  // Build summary lines for secondary events
  const summaryLines: string[] = [];
  if (totalXp > 0) summaryLines.push(`+${totalXp} XP earned`);
  if (badgeCount > 1) summaryLines.push(`${badgeCount} achievements unlocked`);
  else if (badgeCount === 1 && hero.kind !== "badge") summaryLines.push("Achievement unlocked");
  if (leveledUp && hero.kind !== "level-up") summaryLines.push("Level up!");
  if (streakExtended && hero.kind !== "streak") summaryLines.push("Streak extended");
  if (dailyGoalMet && hero.kind !== "daily-goal") summaryLines.push("Daily goal reached");

  return (
    <CenterCard onDismiss={onDismiss}>
      <div
        className="animate-badge-pop celebration-card__icon"
        style={heroColor ? { color: heroColor } : undefined}
      >
        <Icon name={heroIcon} size={56} />
      </div>
      <h3 className="celebration-card__title">{heroTitle}</h3>
      {heroSub && (
        <p className="celebration-card__sub">
          {hero.kind === "level-up" ? (
            <>
              You&apos;re now a <strong>{levelTitle(hero.level)}</strong>. Keep going.
            </>
          ) : hero.kind === "badge" ? (
            <span style={{ color: TIER_COLOR[BADGE_BY_ID[hero.badgeId]?.tier ?? "bronze"] }}>
              {heroSub}
            </span>
          ) : (
            heroSub
          )}
        </p>
      )}

      {/* Secondary event summary */}
      {summaryLines.length > 0 && (
        <div className="celebration-summary">
          {summaryLines.map((line, i) => (
            <div key={i} className="celebration-summary__row">
              <span className="celebration-summary__plus">+</span>
              {line}
            </div>
          ))}
        </div>
      )}
    </CenterCard>
  );
}

export default function EngagementLayer() {
  const mounted = useMounted();
  const celebrations = useProgressStore((s) => s.celebrations);
  const dequeue = useProgressStore((s) => s.dequeueCelebration);
  const clearAll = useProgressStore((s) => s.clearCelebrations);
  const current = celebrations[0] ?? null;

  // Batch mode: when multiple celebrations are queued, show a summary card
  // instead of sequential overlays. Only dequeue the entire batch at once.
  const [batchMode, setBatchMode] = useState(false);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!current) {
      setBatchMode(false);
      return;
    }

    // If there are 2+ celebrations queued, switch to batch mode
    if (celebrations.length >= 2 && !batchMode) {
      // Give a short delay for any additional celebrations to arrive
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(() => {
        setBatchMode(true);
      }, 300);
      return () => {
        if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      };
    }

    // In batch mode, show the summary card for a longer duration
    if (batchMode) {
      const ms = 3000; // 3 seconds for batch summary
      const id = window.setTimeout(() => {
        // Dequeue all celebrations at once — single state update
        clearAll();
        setBatchMode(false);
      }, ms);
      return () => window.clearTimeout(id);
    }

    // Single celebration: normal behavior
    const ms = DURATION[current.kind] ?? 2500;
    const id = window.setTimeout(() => dequeue(), ms);
    return () => window.clearTimeout(id);
  }, [current, celebrations, batchMode, dequeue, clearAll]);

  if (!mounted || !current) return null;

  // XP-only batches: show as a floating chip (no overlay needed)
  if (batchMode && celebrations.every((c) => c.kind === "xp")) {
    const totalXp = celebrations.reduce(
      (sum, c) => (c.kind === "xp" ? sum + c.amount : sum),
      0
    );
    return <XpChip label={`+${totalXp} XP earned`} />;
  }

  // Batch mode with mixed celebrations: show summary card
  if (batchMode && celebrations.length >= 2) {
    const summary = summarizeBatch(celebrations);
    if (summary) {
      return (
        <BatchCelebrationCard
          summary={summary}
          onDismiss={() => {
            clearAll();
            setBatchMode(false);
          }}
        />
      );
    }
  }

  // Single XP celebration: floating chip
  if (current.kind === "xp") {
    return <XpChip label={`+${current.amount} XP · ${current.reason}`} />;
  }

  // Single non-XP celebration: normal center card
  if (current.kind === "level-up") {
    return (
      <CenterCard onDismiss={dequeue}>
        <div className="animate-badge-pop celebration-card__icon">
          <Icon name="star" size={56} />
        </div>
        <h3 className="celebration-card__title">Level {current.level}!</h3>
        <p className="celebration-card__sub">
          You&apos;re now a <strong>{levelTitle(current.level)}</strong>. Keep going.
        </p>
      </CenterCard>
    );
  }

  if (current.kind === "badge") {
    const badge = BADGE_BY_ID[current.badgeId];
    if (!badge) return null;
    const tierColor = TIER_COLOR[badge.tier];
    return (
      <CenterCard onDismiss={dequeue}>
        <div
          className="animate-badge-pop celebration-card__badge-disc"
          style={{ color: tierColor, border: `3px solid ${tierColor}` }}
        >
          <Icon name={badge.icon} size={46} />
        </div>
        <p className="celebration-card__kicker" style={{ color: tierColor }}>
          {badge.tier} · Achievement unlocked
        </p>
        <h3 className="celebration-card__title celebration-card__title--tight">{badge.title}</h3>
        <p className="celebration-card__sub">{badge.description}</p>
      </CenterCard>
    );
  }

  if (current.kind === "streak") {
    return (
      <CenterCard onDismiss={dequeue}>
        <div className="celebration-card__icon">
          <Icon name="flame" size={60} />
        </div>
        <h3 className="celebration-card__title">{current.streak}-day streak!</h3>
        <p className="celebration-card__sub">
          Showing up daily — that&apos;s how learning sticks.
        </p>
      </CenterCard>
    );
  }

  if (current.kind === "daily-goal") {
    return (
      <CenterCard onDismiss={dequeue}>
        <div className="animate-badge-pop celebration-card__icon">
          <Icon name="target" size={56} />
        </div>
        <h3 className="celebration-card__title">Daily goal complete!</h3>
        <p className="celebration-card__sub">
          {current.goal} parts studied today. Beautifully done.
        </p>
      </CenterCard>
    );
  }

  return null;
}
