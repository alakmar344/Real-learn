"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Sidebar from "@/components/shared/Sidebar";
import dynamic from "next/dynamic";

const PreferenceModal = dynamic(() => import("@/components/shared/PreferenceModal"), {
  ssr: false,
  loading: () => null,
});
const EngagementLayer = dynamic(() => import("@/components/shared/EngagementLayer"), {
  ssr: false,
  loading: () => null,
});

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
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          zIndex: 55,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-md), var(--glass-edge)",
          backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
          transition: "all 350ms var(--ease-spring)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-accent)";
          e.currentTarget.style.color = "var(--accent)";
          e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.color = "var(--text-secondary)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div id="main-content" className="app-main">{children}</div>
      <EngagementLayer />
      <PreferenceModal open={showFirstPrefs} onClose={() => setShowFirstPrefs(false)} />
    </div>
  );
}
