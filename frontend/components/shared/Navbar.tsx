"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import BrandMark from "@/components/shared/BrandMark";

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
          {/* Plain logo mark, filled in currentColor (theme-aware), no background. */}
          <BrandMark className="navbar-logo" />
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
