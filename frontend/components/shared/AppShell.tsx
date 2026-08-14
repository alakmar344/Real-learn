"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Sidebar from "@/components/shared/Sidebar";
import ScrollToTop from "@/components/shared/ScrollToTop";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Icon } from "@/components/shared/icons";
import OnboardingRedirect from "@/components/onboarding/OnboardingRedirect";
import dynamic from "next/dynamic";

const PreferenceModal = dynamic(() => import("@/components/shared/PreferenceModal"), {
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

const HIDE_SIDEBAR_PREFIXES = ["/sign-in", "/sign-up", "/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [showFirstPrefs, setShowFirstPrefs] = useState(false);

  const hideSidebar = HIDE_SIDEBAR_PREFIXES.some((p) => pathname?.startsWith(p));
  // The linear onboarding wizard owns the whole first-time experience — the
  // legacy first-run modals must never fire on top of it (the wizard marks
  // their localStorage flags done, so they also stay quiet afterwards).
  const onOnboarding = pathname?.startsWith("/onboarding") ?? false;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);



  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    if (onOnboarding) return;
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
  }, [isLoaded, isSignedIn, onOnboarding]);

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
        <OnboardingRedirect />
        <PreferenceModal open={showFirstPrefs} onClose={() => setShowFirstPrefs(false)} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <OnboardingRedirect />
      <button
        type="button"
        className="app-sidebar-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="app-sidebar"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="menu" size={20} />
      </button>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div id="main-content" className="app-main">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
      <ScrollToTop />
      <EngagementLayer />
      <KeyboardShortcuts />
      <PreferenceModal open={showFirstPrefs} onClose={() => setShowFirstPrefs(false)} />
    </div>
  );
}
