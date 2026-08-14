"use client";

/**
 * OAuth landing pad for the onboarding wizard's "Continue with Google" step.
 * Clerk finishes the handshake here (including first-time sign-ups via the
 * automatic transfer flow) and then returns the user to /onboarding, where
 * the wizard resumes on the next slide.
 */

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function OnboardingSSOCallbackPage() {
  return (
    <main className="onboarding-canvas" aria-busy="true">
      <div className="onboarding-card onboarding-card--loading">
        <div className="onboarding-spinner" aria-hidden="true" />
        <p className="onboarding-loading-text">Finishing sign-in…</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/onboarding"
        signUpForceRedirectUrl="/onboarding"
      />
    </main>
  );
}
