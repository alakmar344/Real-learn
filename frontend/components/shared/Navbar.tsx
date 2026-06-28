"use client";

import Link from "next/link";

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
        height: compact ? "auto" : 56,
        minHeight: 56,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-glass)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="navbar-inner"
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          padding: compact ? "12px 24px" : "0 24px",
          minHeight: compact ? "auto" : 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 12,
        }}
      >
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
            <rect width="120" height="40" rx="8" fill="#1a3a5c" />
            <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="18" fill="#faf7f2">
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
            <span style={{ color: "var(--accent)" }}>Learn</span>
          </span>
        </Link>
      </div>

      <style jsx>{`
        /* Make room for the fixed sidebar toggle on small screens. */
        @media (max-width: 900px) {
          .navbar-inner {
            padding-left: 64px !important;
          }
        }
      `}</style>
    </header>
  );
}
