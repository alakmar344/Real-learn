"use client";

import { useEffect, useRef, useState } from "react";

const linkStyle: React.CSSProperties = {
  color: "var(--accent)",
  padding: "6px 4px",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  fontWeight: 500,
};

const FIRST_VISIT_KEY = "reallearn-first-visit";
const MILESTONES = new Set([7, 30, 100, 365]);

/**
 * "Learning together for N days" — a tiny companionship counter. The first
 * visit timestamp is remembered locally, so the app quietly keeps track of
 * your shared history and celebrates the big round numbers with you.
 * Rendered only after mount (SSR shows nothing) so hydration never mismatches.
 */
function CompanionDays() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    try {
      let first = localStorage.getItem(FIRST_VISIT_KEY);
      if (!first || Number.isNaN(Number(first))) {
        first = String(Date.now());
        localStorage.setItem(FIRST_VISIT_KEY, first);
      }
      setDays(Math.max(1, Math.floor((Date.now() - Number(first)) / 86_400_000) + 1));
    } catch {
      // Private mode / storage blocked — just skip the line.
    }
  }, []);

  if (days === null) return null;

  const label =
    days === 1
      ? "Day 1 of our learning journey together 💛"
      : MILESTONES.has(days)
        ? `🎉 ${days} days of learning together — thank you for staying curious with us!`
        : `Learning together for ${days} days 💛`;

  return (
    <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic", lineHeight: 1.7 }}>
      {label}
    </p>
  );
}

const Footer = ({ className }: { className?: string }) => {
  const clicks = useRef<number[]>([]);

  // Easter egg: click/tap the RealLearn wordmark 5 times within 3 seconds
  // → heart burst (handled globally by <EasterEggs />).
  const onBrandClick = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 3000), now];
    if (clicks.current.length >= 5) {
      clicks.current = [];
      window.dispatchEvent(
        new CustomEvent("reallearn:egg", {
          detail: { kind: "hearts", message: "💜 You found the heart of RealLearn. It beats for curious people like you." },
        })
      );
    }
  };

  return (
    <footer
      className={className}
      style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "28px 32px",
        textAlign: "center",
        fontSize: 12,
        color: "var(--text-tertiary)",
        lineHeight: 1.7,
        background: "var(--bg-glass)",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      }}
    >
      <p style={{ margin: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          onClick={onBrandClick}
          style={{
            fontWeight: 800,
            color: "var(--accent)",
            cursor: "default",
            userSelect: "none",
          }}
        >
          RealLearn
        </span>
        {/* suppressHydrationWarning: statically prerendered HTML cached across
            a year boundary would otherwise hydration-error on the year. */}
        <span suppressHydrationWarning>© {new Date().getFullYear()} alakmar344</span>
        <span aria-hidden="true">·</span>
        <span>AI-generated — verify with pros</span>
      </p>
      <p style={{ margin: "6px 0 0", display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <a href="/legal?tab=privacy" style={linkStyle}>Privacy</a>
        <span aria-hidden="true">·</span>
        <a href="/legal?tab=terms" style={linkStyle}>Terms</a>
        <span aria-hidden="true">·</span>
        <a href="/legal" style={linkStyle}>Legal</a>
        <span aria-hidden="true">·</span>
        <a href="mailto:esamzai365@gmail.com" style={linkStyle}>Support</a>
      </p>
      <CompanionDays />
    </footer>
  );
};

export default Footer;
