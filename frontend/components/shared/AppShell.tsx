"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/shared/Sidebar";

const HIDE_SIDEBAR_PREFIXES = ["/sign-in", "/sign-up"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const hideSidebar = HIDE_SIDEBAR_PREFIXES.some((p) => pathname?.startsWith(p));

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While the mobile drawer is open, lock background scroll and allow Escape to
  // close it — both expected behaviours for a mobile slide-out menu.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className="app-sidebar-toggle"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        ☰
      </button>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div id="main-content" className="app-main">{children}</div>
    </div>
  );
}
