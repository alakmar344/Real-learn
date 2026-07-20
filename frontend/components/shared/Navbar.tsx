"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProgressHub from "@/components/shared/ProgressHub";

interface Props {
  compact?: boolean;
}

/** Primary navigation. The links are hidden on the auth pages and on very
 *  small screens (the sidebar + ProgressHub cover wayfinding there), keeping
 *  the bar calm and focused on the brand + the growing-self widget. */
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/progress", label: "Progress" },
];

export default function Navbar({ compact = false }: Props) {
  const pathname = usePathname();

  return (
    <header
      className="engraved texture-dots"
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
          padding: compact ? "18px 32px" : "0 32px",
          minHeight: compact ? "auto" : 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 18,
        }}
      >
        <Link
          href="/"
          aria-label="RealLearn – Home"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "var(--radius-md)",
              background: "var(--accent-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--on-accent)",
              fontWeight: 900,
              boxShadow: "var(--shadow-glow-accent)",
              overflow: "hidden",
              position: "relative",
            }}
            aria-hidden="true"
          >
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none" style={{ position: "relative", zIndex: 1 }}>
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
              <path d="M9 18L14 9L19 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="14" r="3" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <span
            className="animate-gradient-shift"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: -0.5,
              background: "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 50%, var(--text-primary) 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            <span style={{ WebkitTextFillColor: "var(--text-primary)" }}>Real</span>
            <span style={{ WebkitTextFillColor: "var(--accent)" }}>Learn</span>
          </span>
        </Link>

        {/* ── Wayfinding links — calm brush-accented pills.
            Hidden below 900px where the sidebar is the primary nav. ── */}
        <nav
          aria-label="Primary"
          className="navbar-links"
          style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}
        >
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href) ?? false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${active ? " nav-link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <ProgressHub />
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .navbar-inner {
            padding-left: 72px !important;
          }
          .navbar-links {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
