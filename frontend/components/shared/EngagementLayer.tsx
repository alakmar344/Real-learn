"use client";

import { useEffect, useRef, useState } from "react";
import { useProgressStore, Celebration } from "@/store/progressStore";
import { BADGE_BY_ID, TIER_COLOR, levelTitle } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";

/* Duration each celebration type stays on screen. */
const DURATION: Record<Celebration["kind"], number> = {
  xp: 1400,
  "level-up": 3600,
  badge: 3600,
  streak: 3000,
  "daily-goal": 3000,
};

const BURST_COLORS = ["#7FC5E8", "#9FE3C0", "#FFB08C", "#F4A6B8", "var(--correct)", "var(--accent)"];

function Burst() {
  const [pieces] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: 50 + (Math.random() * 30 - 15),
      delay: Math.random() * 0.2,
      size: 5 + Math.random() * 5,
      color: BURST_COLORS[i % BURST_COLORS.length],
      duration: 1.2 + Math.random() * 0.8,
    }))
  );
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

  // A11y: the celebration is a full-screen overlay, so keyboard users must be
  // able to dismiss it too — Escape closes it and focus moves to the real
  // "Continue" button while it is shown, then returns where it was.
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
      className="animate-overlay-fade"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 96,
        background: "var(--scrim, rgba(20,17,12,0.5))",
        backdropFilter: "blur(var(--blur-sm, 4px))",
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
          maxWidth: 340,
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

export default function EngagementLayer() {
  const mounted = useMounted();
  const celebrations = useProgressStore((s) => s.celebrations);
  const dequeue = useProgressStore((s) => s.dequeueCelebration);
  const current = celebrations[0] ?? null;

  useEffect(() => {
    if (!current) return;
    const ms = DURATION[current.kind] ?? 2500;
    const id = window.setTimeout(() => dequeue(), ms);
    return () => window.clearTimeout(id);
    // Re-arm ONLY when the queue head changes — keying on queue length
    // restarted the head's countdown every time a new celebration was
    // enqueued behind it, so a steady stream kept the head up indefinitely.
  }, [current, dequeue]);

  if (!mounted || !current) return null;

  if (current.kind === "xp") {
    return <XpChip item={current} />;
  }

  if (current.kind === "level-up") {
    return (
      <CenterCard onDismiss={dequeue}>
        <div className="animate-badge-pop" style={{ fontSize: 56, lineHeight: 1 }}>⭐</div>
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
            fontSize: 46,
            background: "var(--bg-card)",
            border: `3px solid ${TIER_COLOR[badge.tier]}`,
            boxShadow: "var(--shadow-md)",
          }}
        >
          {badge.emoji}
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
        <div className="flame-flicker" style={{ fontSize: 60, lineHeight: 1 }}>🔥</div>
        <h3 style={{ margin: "10px 0 4px", fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>
          {current.streak}-day streak!
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          Come back tomorrow to keep the flame alive.
        </p>
      </CenterCard>
    );
  }

  if (current.kind === "daily-goal") {
    return (
      <CenterCard onDismiss={dequeue}>
        <div className="animate-badge-pop" style={{ fontSize: 56, lineHeight: 1 }}>🎯</div>
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
