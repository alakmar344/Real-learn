"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Sidebar from "@/components/shared/Sidebar";
import BottomNav from "@/components/shared/BottomNav";
import ScrollToTop from "@/components/shared/ScrollToTop";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import dynamic from "next/dynamic";

const PreferenceModal = dynamic(() => import("@/components/shared/PreferenceModal"), {
  ssr: false,
  loading: () => null,
});
const ThingsComingModal = dynamic(() => import("@/components/shared/ThingsComingModal"), {
  ssr: false,
  loading: () => null,
});
const EngagementLayer = dynamic(() => import("@/components/shared/EngagementLayer"), {
  ssr: false,
  loading: () => null,
});
const KeyboardShortcuts = dynamic(() => import("@/components/shared/KeyboardShortcuts"), {
  ssr: false,
  loading: () => null,
});

const HIDE_SIDEBAR_PREFIXES = ["/sign-in", "/sign-up"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [showFirstPrefs, setShowFirstPrefs] = useState(false);
  const [showThingsComing, setShowThingsComing] = useState(false);

  const hideSidebar = HIDE_SIDEBAR_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Check for first-login onboarding modal "Things Coming"
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const seen = localStorage.getItem("reallearn-things-coming-seen");
      if (!seen) {
        timer = setTimeout(() => setShowThingsComing(true), 400);
      }
    } catch {
      // ignore
    }

    const handleOpenEvent = () => setShowThingsComing(true);
    window.addEventListener("reallearn:open-things-coming", handleOpenEvent);

    return () => {
      if (timer !== null) clearTimeout(timer);
      window.removeEventListener("reallearn:open-things-coming", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const done = localStorage.getItem("reallearn-preferences-onboarding");
      if (!done) {
        timer = setTimeout(() => setShowFirstPrefs(true), 0);
      }
    } catch {
      // ignore
    }
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
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
        <div id="main-content">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
        <PreferenceModal open={showFirstPrefs} onClose={() => setShowFirstPrefs(false)} />
        <ThingsComingModal open={showThingsComing} onClose={() => setShowThingsComing(false)} />
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
      <div id="main-content" className="app-main">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
      <BottomNav onOpenLibrary={() => setOpen(true)} />
      <ScrollToTop />
      <EngagementLayer />
      <KeyboardShortcuts />
      <PreferenceModal open={showFirstPrefs} onClose={() => setShowFirstPrefs(false)} />
      <ThingsComingModal open={showThingsComing} onClose={() => setShowThingsComing(false)} />
    </div>
  );
}
