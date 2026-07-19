"use client";

import { useEffect, useRef, useState } from "react";

const linkStyle: React.CSSProperties = {
  color: "var(--accent)",
  padding: "6px 4px",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  fontWeight: 500,
  textDecoration: "none",
  transition: "all 200ms var(--ease-color)",
  borderRadius: "var(--radius-sm)",
};

const FIRST_VISIT_KEY = "reallearn-first-visit";
const MILESTONES = new Set([7, 30, 100, 365]);

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
    <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic", lineHeight: 1.7 }}>
      {label}
    </p>
  );
}

const Footer = ({ className }: { className?: string }) => {
  const clicks = useRef<number[]>([]);

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
        <span
          onClick={onBrandClick}
          style={{
            fontWeight: 800,
            color: "var(--accent)",
            cursor: "default",
            userSelect: "none",
            transition: "transform 200ms var(--ease-spring)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          RealLearn
        </span>
        <span suppressHydrationWarning>© {new Date().getFullYear()} alakmar344</span>
        <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
        <span>AI-generated — verify with pros</span>
      </div>
      <nav
        aria-label="Footer navigation"
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <a href="/legal?tab=privacy" style={linkStyle} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-dim)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>Privacy</a>
        <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
        <a href="/legal?tab=terms" style={linkStyle} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-dim)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>Terms</a>
        <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
        <a href="/legal" style={linkStyle} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-dim)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>Legal</a>
        <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
        <a href="mailto:esamzai365@gmail.com" style={linkStyle} onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-dim)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>Support</a>
      </nav>
      <CompanionDays />
    </footer>
  );
};

export default Footer;
