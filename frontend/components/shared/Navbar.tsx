"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProgressHub from "@/components/shared/ProgressHub";

interface Props {
  compact?: boolean;
}

// Primary nav. Links hide below 900px (sidebar + ProgressHub handle wayfinding there).
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/progress", label: "Progress" },
];

export default function Navbar({ compact = false }: Props) {
  const pathname = usePathname();

  return (
    <header className={`navbar engraved texture-dots${compact ? " navbar--compact" : ""}`}>
      <div className="navbar-inner">
        <Link href="/" aria-label="RealLearn – Home" className="navbar-brand">
          <div className="navbar-logo" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none" style={{ position: "relative", zIndex: 1 }}>
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
              <path d="M9 18L14 9L19 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="14" r="3" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <span className="navbar-wordmark">
            <span className="navbar-wordmark__real">Real</span>
            <span className="navbar-wordmark__learn">Learn</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="navbar-links">
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
    </header>
  );
}
