"use client";

/**
 * Routes brand-new visitors into the linear onboarding wizard.
 *
 * Mounted once in AppShell (renders nothing). Rules:
 *  - Anyone who finished the wizard is left alone.
 *  - Existing users are BACKFILLED as complete and never see the wizard:
 *    a signed-in account, or any previously-accepted consent record, proves
 *    they already went through the old first-run flow (whose re-consent /
 *    personalization modals still cover them).
 *  - Only genuinely new, anonymous visitors landing on the home page are
 *    redirected — deep links (e.g. /legal) are never hijacked.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { readLegalConsent } from "@/lib/legalConsent";
import { isOnboardingComplete, markOnboardingComplete } from "@/lib/onboarding";

export default function OnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    // Never interfere while the wizard itself is on screen — a mid-flow user
    // who just signed in (slide 3) must NOT be backfilled as "complete", or
    // they'd be ejected before the personalization slide.
    if (pathname?.startsWith("/onboarding")) return;
    if (isOnboardingComplete()) return;

    const consent = readLegalConsent();
    if (isSignedIn || consent?.accepted) {
      // Existing user from the pre-wizard era — don't re-onboard them.
      markOnboardingComplete();
      return;
    }

    if (pathname === "/" || pathname === "") {
      router.replace("/onboarding");
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
