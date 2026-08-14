// Onboarding-flow helpers.
//
// The first-time experience is a linear 5-step wizard at /onboarding
// (Welcome → Legal + Age → Account → Personalize → Start). These helpers keep
// the "has this browser finished onboarding?" flag and the "which slide were
// they on?" position in ONE place so the wizard, the home-page redirect and
// the legacy first-run modals all agree.
//
// All storage access goes through the safe helpers in lib/legalConsent so a
// blocked localStorage (private mode, "Block all cookies") can never crash
// the app.

import { safeGetItem, safeSetItem } from "./legalConsent.ts";

export const ONBOARDING_COMPLETE_KEY = "reallearn-onboarding-complete";
export const ONBOARDING_STEP_KEY = "reallearn-onboarding-step";

/** Total number of slides in the wizard. Used by the progress indicator. */
export const ONBOARDING_TOTAL_STEPS = 5;

export function isOnboardingComplete(): boolean {
  return safeGetItem(ONBOARDING_COMPLETE_KEY) === "true";
}

export function markOnboardingComplete(): void {
  safeSetItem(ONBOARDING_COMPLETE_KEY, "true");
}

/**
 * Persisted slide position so a full-page redirect (Google OAuth) or an
 * accidental refresh drops the user back on the slide they were on instead
 * of restarting the flow.
 */
export function readOnboardingStep(): number {
  const raw = safeGetItem(ONBOARDING_STEP_KEY);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), ONBOARDING_TOTAL_STEPS);
}

export function writeOnboardingStep(step: number): void {
  safeSetItem(ONBOARDING_STEP_KEY, String(step));
}
