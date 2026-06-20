"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LanguageSelector from "@/components/shared/LanguageSelector";
import LevelSelector from "@/components/shared/LevelSelector";
import { useLessonStore } from "@/store/lessonStore";

interface Props {
  compact?: boolean;
}

export default function Navbar({ compact = false }: Props) {
  const { language, level, setLanguage, setLevel } = useLessonStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Close mobile menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: compact ? "auto" : 56,
        minHeight: 56,
        borderBottom: "1px solid var(--border-subtle)",
        background: compact ? "rgba(10,10,10,0.9)" : "rgba(10,10,10,0.55)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          padding: compact ? "12px 24px" : "0 24px",
          minHeight: compact ? "auto" : 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Logo / brand */}
        <Link
          href="/"
          aria-label="RealLearn – Home"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 40"
            fill="none"
            aria-hidden="true"
            style={{ width: 40, height: "auto" }}
          >
            <rect width="120" height="40" rx="8" fill="#f5c518" />
            <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="18" fill="#0a0a0a">
              RL
            </text>
          </svg>
          <span
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: -0.4,
            }}
          >
            <span style={{ color: "var(--text-primary)" }}>Real</span>
            <span style={{ color: "var(--gold-primary)" }}>Learn</span>
          </span>
        </Link>

        {/* Desktop selectors */}
        <div
          className="navbar-selectors-desktop"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <LanguageSelector value={language} onChange={setLanguage} compact={compact} />
          <LevelSelector value={level} onChange={setLevel} compact={compact} />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="navbar-hamburger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="navbar-mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "none",
            background: "transparent",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "8px 10px",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          id="navbar-mobile-menu"
          ref={menuRef}
          role="menu"
          className="animate-fade-up"
          style={{
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-default)",
            padding: "16px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <LanguageSelector value={language} onChange={setLanguage} compact={compact} />
          <LevelSelector value={level} onChange={setLevel} compact={compact} />
        </div>
      )}

      {/* Responsive overrides */}
      <style jsx>{`
        @media (max-width: 640px) {
          .navbar-selectors-desktop {
            display: none !important;
          }
          .navbar-hamburger {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}
