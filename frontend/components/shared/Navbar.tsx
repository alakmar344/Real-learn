"use client";

import Link from "next/link";
import ProgressHub from "@/components/shared/ProgressHub";

interface Props {
  compact?: boolean;
}

export default function Navbar({ compact = false }: Props) {
  return (
    <header
      className="engraved"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: compact ? "auto" : 72,
        minHeight: 72,
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
          maxWidth: 1200,
          margin: "0 auto",
          padding: compact ? "16px 28px" : "0 28px",
          minHeight: compact ? "auto" : 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 16,
        }}
      >
        <Link
          href="/"
          aria-label="RealLearn – Home"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "var(--accent-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--on-accent)",
              fontWeight: 900,
              fontSize: 17,
              fontFamily: "var(--font-inter)",
              boxShadow: "var(--shadow-glow-accent)",
            }}
          >
            RL
          </div>
          <span
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 800,
              fontSize: 26,
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
        @media (max-width: 900px) {
          .navbar-inner {
            padding-left: 72px !important;
          }
        }
      `}</style>
    </header>
  );
}
