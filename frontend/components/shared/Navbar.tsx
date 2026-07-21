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
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" opacity="0.35" />
              <path d="M14 7C17 10.5 17 14 14 17.5C11 14 11 10.5 14 7Z" fill="currentColor" opacity="0.65" />
              <path d="M7.5 13.5C11 13.5 13 15 14 18.5C10.5 18.5 8.5 17 7.5 13.5Z" fill="currentColor" opacity="0.45" />
              <path d="M20.5 13.5C17 13.5 15 15 14 18.5C17.5 18.5 19.5 17 20.5 13.5Z" fill="currentColor" opacity="0.45" />
              <path d="M8.5 21H13.6C13.9 21 14.1 21.1 14.4 21.3C14.7 21.1 15 21 15.3 21H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
