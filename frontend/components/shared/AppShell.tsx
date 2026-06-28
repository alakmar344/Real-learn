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
      <div className="app-main">{children}</div>
    </div>
  );
}
