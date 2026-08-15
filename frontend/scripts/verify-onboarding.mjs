// Verifies the invariants of the linear onboarding wizard (/onboarding):
// step-gating order, back-not-skip navigation, legacy-modal handoff, and the
// route wiring that keeps the flow reachable. Source-level checks in the same
// spirit as verify-reconsent-copy.mjs — they pin the contract, not the markup.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p) => readFile(new URL(p, import.meta.url), "utf8");

const wizard = await read("../components/onboarding/OnboardingWizard.tsx");
const redirect = await read("../components/onboarding/OnboardingRedirect.tsx");
const onboardingLib = await read("../lib/onboarding.ts");
const middleware = await read("../proxy.ts");
const appShell = await read("../components/shared/AppShell.tsx");
const preSignIn = await read("../components/shared/PreSignInConsent.tsx");

test("onboarding wizard", async (t) => {
  await t.test("has exactly 5 steps with a visible step indicator", () => {
    assert.match(onboardingLib, /ONBOARDING_TOTAL_STEPS = 5/);
    assert.match(wizard, /Step \{step\} of \{ONBOARDING_TOTAL_STEPS\}/);
    assert.match(wizard, /role="progressbar"/);
  });

  await t.test("steps unlock in order and stored position can never skip ahead", () => {
    // The resume logic derives the furthest EARNED slide from real state...
    assert.match(wizard, /let unlocked = 2/);
    assert.match(wizard, /if \(consentOk\) unlocked = 3/);
    assert.match(wizard, /if \(consentOk && isSignedIn\) unlocked = 4/);
    assert.match(
      wizard,
      /if \(consentOk && isSignedIn && personalizationOnboarded\) unlocked = 5/
    );
    // ...and clamps the persisted step to it.
    assert.match(wizard, /Math\.min\(Math\.max\(stored, 1\), unlocked\)/);
  });

  await t.test("legal slide keeps the age gate (under-13 block, 13-17 parental ack)", () => {
    assert.match(wizard, /ageStatus === "under13"/);
    assert.match(wizard, /ageStatus === "minor" && parentalAck/);
    // Only the bracket is persisted, never the exact DOB.
    assert.match(wizard, /ageBracket: ageStatus === "minor" \? "13-17" : "18\+"/);
    assert.doesNotMatch(wizard, /dob(Year|Month|Day)[^\n]*writeLegalConsent/);
  });

  await t.test("consent is written with the CURRENT policy versions", () => {
    assert.match(wizard, /privacyVersion: CURRENT_PRIVACY_VERSION/);
    assert.match(wizard, /termsVersion: CURRENT_TERMS_VERSION/);
    // And synced to the account once the user signs in.
    assert.match(wizard, /syncLegalConsentToBackend/);
  });

  await t.test("account slide uses Google OAuth and returns to the wizard", () => {
    assert.match(wizard, /strategy: "oauth_google"/);
    assert.match(wizard, /redirectUrl: "\/onboarding"/);
    assert.match(wizard, /redirectCallbackUrl: "\/onboarding\/sso-callback"/);
  });

  await t.test("finishing marks onboarding complete (no modal pile-up)", () => {
    assert.match(wizard, /markOnboardingComplete\(\)/);
    assert.match(wizard, /onboarded: true/);
  });
});

test("routing and redirect", async (t) => {
  await t.test("/onboarding (and its OAuth callback) is a public route", () => {
    assert.match(middleware, /"\/onboarding\(\.\*\)"/);
  });

  await t.test("only new anonymous visitors on the home page are redirected in", () => {
    assert.match(redirect, /router\.replace\("\/onboarding"\)/);
    // Existing users (signed in, or previously accepted) are backfilled instead.
    assert.match(redirect, /isSignedIn \|\| consent\?\.accepted/);
    assert.match(redirect, /markOnboardingComplete\(\)/);
    // And the redirect never interferes while the wizard itself is on screen.
    assert.match(redirect, /startsWith\("\/onboarding"\)\) return/);
  });

  await t.test("wizard renders full-screen (no sidebar) and the consent modal stands down", () => {
    // The legacy PreferenceModal/PersonalizationGate backfill modals were
    // removed 2026-08-15 — the wizard owns first-run and Settings owns edits.
    assert.match(appShell, /"\/onboarding"/);
    assert.match(preSignIn, /onOnboardingPath/);
  });
});
