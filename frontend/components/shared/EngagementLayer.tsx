"use client";

import { useEffect, useRef, useState } from "react";
import { useProgressStore, Celebration } from "@/store/progressStore";
import { BADGE_BY_ID, TIER_COLOR, levelTitle } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { celebrationColors } from "@/lib/palette";
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

function Burst() {
  // Resolve colors at burst time so they track the active theme.
  const [pieces] = useState(() => {
    const colors = celebrationColors();
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: 50 + (Math.random() * 30 - 15),
      delay: Math.random() * 0.2,
      size: 5 + Math.random() * 5,
      color: colors[i % colors.length],
      duration: 1.2 + Math.random() * 0.8,
    }));
  });
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: "38%",
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s var(--ease-reveal) both`,
          }}
        />
      ))}
    </div>
  );
}

/** Small non-blocking XP chip that floats up near the top. */
function XpChip({ item }: { item: Extract<Celebration, { kind: "xp" }> }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 70,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 95,
        pointerEvents: "none",
      }}
    >
      <div
        className="animate-xp-pop"
        style={{
          background: "var(--accent)",
          color: "var(--on-accent)",
          borderRadius: 999,
          padding: "7px 16px",
          fontWeight: 800,
          fontSize: 14,
          boxShadow: "var(--shadow-sm)",
          whiteSpace: "nowrap",
        }}
      >
        +{item.amount} XP · {item.reason}
      </div>
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 96,
        background: "var(--scrim, rgba(20,17,12,0.5))",
        display: "grid",
        placeItems: "center",
        padding: 24,
        cursor: "pointer",
      }}
    >
      <Burst />
      <div
        className="animate-level-burst"
        style={{
          position: "relative",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "28px 32px",
          textAlign: "center",
          maxWidth: 380,
          width: "100%",
        }}
      >
        {children}
        <button
          ref={dismissRef}
          type="button"
          onClick={onDismiss}
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "var(--text-tertiary)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "6px 10px",
            minHeight: 32,
          }}
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
  let heroColor = "var(--accent)";
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
        className="animate-badge-pop"
        style={{ display: "flex", justifyContent: "center", lineHeight: 1, color: heroColor }}
      >
        <Icon name={heroIcon} size={56} />
      </div>
      <h3
        style={{
          margin: "12px 0 4px",
          fontSize: 24,
          fontWeight: 800,
          color: "var(--text-primary)",
        }}
      >
        {heroTitle}
      </h3>
      {heroSub && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          {hero.kind === "level-up" ? (
            <>
              You&apos;re now a{" "}
              <strong style={{ color: "var(--accent)" }}>
                {levelTitle(hero.level)}
              </strong>
              . Keep going.
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
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "color-mix(in srgb, var(--accent) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
            textAlign: "left",
          }}
        >
          {summaryLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                padding: "3px 0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>+</span>
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
    return (
      <div
        style={{
          position: "fixed",
          top: 70,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 95,
          pointerEvents: "none",
        }}
      >
        <div
          className="animate-xp-pop"
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            borderRadius: 999,
            padding: "7px 16px",
            fontWeight: 800,
            fontSize: 14,
            boxShadow: "var(--shadow-sm)",
            whiteSpace: "nowrap",
          }}
        >
          +{totalXp} XP earned
        </div>
      </div>
    );
  }

  // Batch mode with mixed celebrations: show summary card
  if (batchMode && celebrations.length >= 2) {
    const summary = summarizeBatch(celebrations);
    if (summary) {
      return <BatchCelebrationCard summary={summary} onDismiss={() => {
        clearAll();
        setBatchMode(false);
      }} />;
    }
  }

  // Single XP celebration: floating chip
  if (current.kind === "xp") {
    return <XpChip item={current} />;
  }

  // Single non-XP celebration: normal center card
  if (current.kind === "level-up") {
    return (
      <CenterCard onDismiss={dequeue}>
        <div
          className="animate-badge-pop"
          style={{ display: "flex", justifyContent: "center", lineHeight: 1, color: "var(--accent)" }}
        >
          <Icon name="star" size={56} />
        </div>
        <h3 style={{ margin: "12px 0 4px", fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
          Level {current.level}!
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          You&apos;re now a <strong style={{ color: "var(--accent)" }}>{levelTitle(current.level)}</strong>. Keep going.
        </p>
      </CenterCard>
    );
  }

  if (current.kind === "badge") {
    const badge = BADGE_BY_ID[current.badgeId];
    if (!badge) return null;
    return (
      <CenterCard onDismiss={dequeue}>
        <div
          className="animate-badge-pop"
          style={{
            width: 92,
            height: 92,
            margin: "0 auto",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: TIER_COLOR[badge.tier],
            background: "var(--bg-card)",
            border: `3px solid ${TIER_COLOR[badge.tier]}`,
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Icon name={badge.icon} size={46} />
        </div>
        <p style={{ margin: "12px 0 2px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: TIER_COLOR[badge.tier], fontWeight: 800 }}>
          {badge.tier} · Achievement unlocked
        </p>
        <h3 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{badge.title}</h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>{badge.description}</p>
      </CenterCard>
    );
  }

  if (current.kind === "streak") {
    return (
      <CenterCard onDismiss={dequeue}>
        <div
          className="flame-flicker"
          style={{ display: "flex", justifyContent: "center", lineHeight: 1, color: "var(--accent)" }}
        >
          <Icon name="flame" size={60} />
        </div>
        <h3 style={{ margin: "10px 0 4px", fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>
          {current.streak}-day streak!
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          Showing up daily — that&apos;s how learning sticks.
        </p>
      </CenterCard>
    );
  }

  if (current.kind === "daily-goal") {
    return (
      <CenterCard onDismiss={dequeue}>
        <div
          className="animate-badge-pop"
          style={{ display: "flex", justifyContent: "center", lineHeight: 1, color: "var(--accent)" }}
        >
          <Icon name="target" size={56} />
        </div>
        <h3 style={{ margin: "12px 0 4px", fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
          Daily goal complete!
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          {current.goal} parts studied today. Beautifully done.
        </p>
      </CenterCard>
    );
  }

  return null;
}
