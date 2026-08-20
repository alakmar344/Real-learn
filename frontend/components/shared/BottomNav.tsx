"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { Icon, type IconName } from "@/components/shared/icons";
import { triggerHaptic } from "@/lib/haptics";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/learn", label: "Learn", icon: "book-open" },
  { href: "/progress", label: "Stats", icon: "trophy" },
];

function BottomNavBase() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile Navigation" className="bottom-nav">
      <div className="bottom-nav__inner">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href) ?? false;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic("light")}
              className={`bottom-nav__item${isActive ? " bottom-nav__item--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="bottom-nav__icon-wrap">
                <Icon
                  name={item.icon}
                  size={20}
                  className="bottom-nav__icon"
                />
              </span>
              <span className="bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(BottomNavBase);
