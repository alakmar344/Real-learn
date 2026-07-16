"use client";

import Link from "next/link";
import ProgressHub from "@/components/shared/ProgressHub";

interface Props {
  compact?: boolean;
}

export default function Navbar({ compact = false }: Props) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: compact ? "auto" : 64,
        minHeight: 64,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-glass)",
        backdropFilter: "blur(var(--glass-blur-strong)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-strong)) saturate(var(--glass-saturate))",
        boxShadow: "var(--glass-edge)",
      }}
    >
      <div
        className="navbar-inner"
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          padding: compact ? "14px 24px" : "0 24px",
          minHeight: compact ? "auto" : 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 12,
        }}
      >
        <Link
          href="/"
          aria-label="RealLearn – Home"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 40"
            fill="none"
            aria-hidden="true"
            style={{
              width: 42,
              height: "auto",
              filter: "drop-shadow(0 2px 4px rgba(96, 85, 226, 0.2))",
            }}
          >
            <defs>
              <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5b5bd6" />
                <stop offset="100%" stopColor="#7c6eef" />
              </linearGradient>
            </defs>
            <rect width="120" height="40" rx="12" fill="url(#logo-gradient)" />
            <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="18" fill="white">
              RL
            </text>
          </svg>
          <span
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: -0.5,
            }}
          >
            <span style={{ color: "var(--text-primary)" }}>Real</span>
            <span style={{ color: "var(--accent)" }}>Learn</span>
          </span>
        </Link>

        <ProgressHub />
      </div>

      <style jsx>{`
        /* Make room for the fixed sidebar toggle on small screens. */
        @media (max-width: 900px) {
          .navbar-inner {
            padding-left: 68px !important;
          }
        }
      `}</style>
    </header>
  );
}
