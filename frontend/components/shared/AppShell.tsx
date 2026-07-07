"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Sidebar from "@/components/shared/Sidebar";
import PreferenceModal from "@/components/shared/PreferenceModal";
import EngagementLayer from "@/components/shared/EngagementLayer";

const HIDE_SIDEBAR_PREFIXES = ["/sign-in", "/sign-up"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [showFirstPrefs, setShowFirstPrefs] = useState(false);

  const hideSidebar = HIDE_SIDEBAR_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    try {
      const done = localStorage.getItem("reallearn-preferences-onboarding");
      if (!done) {
        setTimeout(() => setShowFirstPrefs(true), 0);
      }
    } catch {
      // ignore
    }
  }, [isLoaded, isSignedIn]);

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
    return (
      <>
        {/* A11y: the skip link targets #main-content, which must exist on
            EVERY page — including the auth pages — or it jumps nowhere. */}
        <div id="main-content">{children}</div>
        <PreferenceModal open={showFirstPrefs} onClose={() => setShowFirstPrefs(false)} />
      </>
    );
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
      <EngagementLayer />
      <PreferenceModal open={showFirstPrefs} onClose={() => setShowFirstPrefs(false)} />
    </div>
  );
}
