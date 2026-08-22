"use client";

/**
 * Historically this routed brand-new visitors into a 5-step onboarding
 * wizard before they could even see the ask box.
 *
 * REBUILD (2026-08): RealLearn is now "open → ask → understand" — nobody is
 * redirected anywhere. New visitors land directly on the homepage ask box.
 * Consent + age confirmation happen in one lightweight step at the moment
 * they actually matter (sign-in / first ask), handled by PreSignInConsent.
 *
 * This component (still mounted once in AppShell, renders nothing) now only
 * backfills the "onboarding complete" flag so any legacy checks that read it
 * — and the wizard route itself, which people can still visit directly —
 * never trap a user in the old flow.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isOnboardingComplete, markOnboardingComplete } from "@/lib/onboarding";

export default function OnboardingRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't interfere while someone is intentionally inside the wizard.
    if (pathname?.startsWith("/onboarding")) return;
    if (!isOnboardingComplete()) markOnboardingComplete();
  }, [pathname]);

  return null;
}
