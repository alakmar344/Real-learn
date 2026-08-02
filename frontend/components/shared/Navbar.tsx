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
    <header className={`navbar engraved${compact ? " navbar--compact" : ""}`}>
      <div className="navbar-inner">
        <Link href="/" aria-label="RealLearn – Home" className="navbar-brand">
          <div className="navbar-logo" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="navbar-logo__icon">
              <path
                d="M5.25 6.75C5.25 5.922 5.922 5.25 6.75 5.25H11.25C12.078 5.25 12.75 5.922 12.75 6.75V18C11.861 17.345 10.74 17 9.6 17H5.25V6.75Z"
                fill="currentColor"
                opacity="0.9"
              />
              <path
                d="M18.75 6.75C18.75 5.922 18.078 5.25 17.25 5.25H12.75V18C13.639 17.345 14.76 17 15.9 17H18.75V6.75Z"
                fill="currentColor"
                opacity="0.55"
              />
              <path
                d="M12 6V18M7.5 8.25H10.5M13.5 8.25H16.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>
          </div>
          <span className="navbar-wordmark" aria-label="RealLearn">
            <span className="navbar-wordmark__name">
              <span className="navbar-wordmark__real">Real</span>
              <span className="navbar-wordmark__learn">Learn</span>
            </span>
            <span className="navbar-wordmark__tag">Structured AI learning</span>
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

        <div className="navbar-actions">
          <ProgressHub />
        </div>
      </div>
    </header>
  );
}
