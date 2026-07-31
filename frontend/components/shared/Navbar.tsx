"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const ProgressHub = dynamic(() => import("@/components/shared/ProgressHub"), {
  ssr: false,
  loading: () => null,
});

interface Props {
  compact?: boolean;
}

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/progress", label: "Stats" },
];

export default function Navbar({ compact = false }: Props) {
  const pathname = usePathname();

  return (
    <header className={`navbar${compact ? " navbar--compact" : ""}`}>
      <div className="navbar-inner">
        <Link href="/" aria-label="RealLearn – Home" className="navbar-brand">
          {/* Mark is drawn in currentColor (--on-accent) so it stays visible
              on the accent tile — accent-on-accent made it disappear. */}
          <div className="navbar-logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="24" height="24" rx="8" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
              <circle cx="14" cy="14" r="5.5" fill="currentColor" opacity="0.4" />
              <circle cx="14" cy="14" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <span className="navbar-wordmark">
            <span className="navbar-wordmark__real">real</span>
            <span className="navbar-wordmark__learn">learn</span>
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
