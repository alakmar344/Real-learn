"use client";

import { useEffect, useRef, useState } from "react";

const FIRST_VISIT_KEY = "reallearn-first-visit";
const MILESTONES = new Set([7, 30, 100, 365]);

// "Day N of learning together" — a quiet local counter; rendered after mount
// to avoid hydration mismatch.
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
      // storage blocked (private mode) — skip
    }
  }, []);

  if (days === null) return null;

  const label = MILESTONES.has(days)
    ? `${days} days of learning together — thanks for sticking with it.`
    : days === 1
      ? "Day 1 — welcome aboard."
      : `Learning together for ${days} days.`;

  return <p className="app-footer__companion">{label}</p>;
}

const Footer = ({ className }: { className?: string }) => {
  const clicks = useRef<number[]>([]);

  // Easter egg: tap the wordmark 5× within 3s → heart burst (handled by <EasterEggs />).
  const onBrandClick = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 3000), now];
    if (clicks.current.length >= 5) {
      clicks.current = [];
      window.dispatchEvent(
        new CustomEvent("reallearn:egg", {
          detail: { kind: "hearts", message: "You found the heart of RealLearn." },
        })
      );
    }
  };

  return (
    <footer className={className}>
      <p className="app-footer__row">
        <span
          className="app-footer__brand"
          onClick={onBrandClick}
          role="button"
          tabIndex={0}
          title="RealLearn — tap 5× for a surprise"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onBrandClick();
            }
          }}
        >
          RealLearn
        </span>
        {/* suppressHydrationWarning: prerendered HTML cached across a year boundary
            would otherwise hydration-error on the year. */}
        <span suppressHydrationWarning>© {new Date().getFullYear()} alakmar344</span>
        <span aria-hidden="true">·</span>
        <span>AI-generated — verify with pros</span>
      </p>
      <p className="app-footer__row app-footer__row--links">
        <a href="/legal?tab=privacy" className="app-footer__link">Privacy</a>
        <span aria-hidden="true">·</span>
        <a href="/legal?tab=terms" className="app-footer__link">Terms</a>
        <span aria-hidden="true">·</span>
        <a href="/legal" className="app-footer__link">Legal</a>
        <span aria-hidden="true">·</span>
        <a href="mailto:esamzai365@gmail.com" className="app-footer__link">Support</a>
      </p>
      <CompanionDays />
    </footer>
  );
};

export default Footer;
