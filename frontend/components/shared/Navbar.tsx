"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ProgressHub from "@/components/shared/ProgressHub";

interface Props {
  compact?: boolean;
}

const OPEN_SIDEBAR_EVENT = "reallearn:open-sidebar";

export default function Navbar({ compact = false }: Props) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const navLinks = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/learn", label: "Learn", icon: "📚" },
    { href: "/progress", label: "Progress", icon: "📈" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  const handleToggle = () => {
    if (!mobileOpen) {
      window.dispatchEvent(new Event(OPEN_SIDEBAR_EVENT));
    }
    setMobileOpen(!mobileOpen);
  };

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
          padding: compact ? "16px 24px" : "0 24px",
          minHeight: compact ? "auto" : 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 16,
        }}
      >
        {/* Mobile hamburger — triggers AppShell sidebar */}
        {isSignedIn && (
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={handleToggle}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 250ms var(--ease-color)",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transition: "transform 300ms var(--ease-spring)" }}
            >
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        )}

        <Link
          href="/"
          aria-label="RealLearn – Home"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
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
              transition: "transform 300ms var(--ease-spring)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05) rotate(-2deg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1) rotate(0deg)";
            }}
          >
            <svg width="30" height="30" viewBox="0 0 120 40" fill="none" style={{ position: "relative", zIndex: 1 }}>
              <rect width="120" height="40" rx="8" fill="currentColor" opacity="0.2" />
              <text x="10" y="27" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="18" fill="currentColor">
                RL
              </text>
            </svg>
          </div>
          <span
            className="animate-gradient-shift"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 26,
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

        <ProgressHub />

        {/* Desktop nav links */}
        <nav
          aria-label="Main navigation"
          style={{
            display: "none",
            alignItems: "center",
            gap: 4,
            marginLeft: 8,
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                color: pathname === link.href ? "var(--accent)" : "var(--text-secondary)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                transition: "all 250ms var(--ease-color)",
                background: pathname === link.href ? "var(--accent-dim)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (pathname !== link.href) {
                  e.currentTarget.style.background = "var(--bg-card-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (pathname !== link.href) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <span style={{ fontSize: 16 }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger — triggers AppShell sidebar */}
        {isSignedIn && (
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={handleToggle}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              marginRight: 8,
              transition: "all 250ms var(--ease-color)",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transition: "transform 300ms var(--ease-spring)" }}
            >
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>

      <style jsx>{`
        @media (min-width: 901px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-nav-toggle {
            display: none !important;
          }
        }
        @media (max-width: 900px) {
          .mobile-nav-toggle {
            display: flex !important;
          }
          .desktop-nav {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
