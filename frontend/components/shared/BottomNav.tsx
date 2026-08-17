"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/shared/icons";

// Mobile-only tab bar (hidden ≥900px via .bottom-nav CSS). Below 900px the
// navbar links are display:none, so this is the only route to the three
// primary destinations.
const ITEMS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Home", icon: "compass" },
  { href: "/learn", label: "Learn", icon: "book-open" },
  { href: "/progress", label: "Stats", icon: "trophy" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      {ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href) ?? false;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="bottom-nav__item"
            aria-current={active ? "page" : undefined}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
