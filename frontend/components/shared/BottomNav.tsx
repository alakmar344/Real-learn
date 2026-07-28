"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Mobile bottom tab bar — the primary wayfinding surface below 900px.
 *
 * Why it exists: on mobile the navbar links are hidden and the sidebar
 * collapses into a hamburger, which previously left NO visible route to
 * Home or Progress. A fixed bottom bar keeps the three primary destinations
 * inside the thumb zone (one-handed reachability), with 56px targets that
 * clear the 44px accessibility minimum.
 *
 * The "Library" item opens the sidebar drawer (saved lessons) rather than
 * navigating — progressive disclosure of the deeper archive without adding
 * a fourth route.
 *
 * Desktop (>900px) hides this entirely via CSS; the sidebar + navbar own
 * navigation there. Rendered only by AppShell on non-auth pages.
 */
export default function BottomNav({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/learn";
  const isProgress = pathname === "/progress";

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <Link
        href="/"
        className="bottom-nav__item"
        aria-current={isHome ? "page" : undefined}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M10 21v-6h4v6" />
        </svg>
        Learn
      </Link>
      <button type="button" className="bottom-nav__item" onClick={onOpenLibrary}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" />
          <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
        </svg>
        Library
      </button>
      <Link
        href="/progress"
        className="bottom-nav__item"
        aria-current={isProgress ? "page" : undefined}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20H2" />
        </svg>
        Progress
      </Link>
    </nav>
  );
}
