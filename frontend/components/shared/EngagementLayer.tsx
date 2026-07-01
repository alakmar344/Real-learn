"use client";

import { useEffect, useState } from "react";
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

const BURST_COLORS = ["#f59e0b", "#ec4899", "#3b82f6", "#8b5cf6", "var(--correct)", "var(--accent)"];

function Burst() {
  const [pieces] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: 50 + (Math.random() * 40 - 20),
      delay: Math.random() * 0.25,
      size: 7 + Math.random() * 7,
      color: BURST_COLORS[i % BURST_COLORS.length],
      duration: 1.4 + Math.random() * 1.2,
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
          color: "#faf7f2",
          borderRadius: 999,
          padding: "7px 16px",
          fontWeight: 800,
          fontSize: 14,
          boxShadow: "var(--shadow-glow-accent)",
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
        background: "rgba(20,17,12,0.5)",
        backdropFilter: "blur(3px)",
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
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-tertiary)" }}>Tap to continue</div>
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
    // Re-arm whenever the queue head changes.
  }, [current, dequeue, celebrations.length]);

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
            boxShadow: `0 0 24px ${TIER_COLOR[badge.tier]}55`,
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
