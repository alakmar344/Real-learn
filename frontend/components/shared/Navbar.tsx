"use client";

import Link from "next/link";
import Image from "next/image";
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
            <Image src="/favicon.png" alt="" width={28} height={28} className="navbar-logo__img" />
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
