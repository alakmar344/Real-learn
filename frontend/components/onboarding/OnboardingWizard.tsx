"use client";

/**
 * OnboardingWizard — the linear, slide-based first-time experience.
 *
 * Five small slides, each one obvious action, each unlocking the next:
 *   1. Welcome        — what RealLearn is, in plain words
 *   2. Legal + Age    — date of birth + accept Privacy/Terms (one screen)
 *   3. Account        — continue with Google (Clerk OAuth)
 *   4. Personalize    — level, goal, learning style (skippable)
 *   5. Start          — celebrate, then drop into the product
 *
 * Rules:
 *  - Back is always allowed; skipping ahead never is (Next stays disabled
 *    until the current slide's single requirement is met).
 *  - Progress ("Step n of 5") is always visible.
 *  - The slide position survives full-page redirects (Google OAuth) and
 *    refreshes via localStorage, so nobody ever restarts the flow.
 *
 * It reuses the exact same consent + personalization primitives as the
 * legacy first-run modals (lib/legalConsent, lib/personalization,
 * preferenceStore), so completing the wizard satisfies every legacy gate.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn, useUser } from "@clerk/nextjs";
import { Icon } from "@/components/shared/icons";
import { usePreferenceStore } from "@/store/preferenceStore";
import type { Level } from "@/types";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  isConsentCurrent,
  readLegalConsent,
  syncLegalConsentToBackend,
  writeLegalConsent,
  type LegalConsentState,
} from "@/lib/legalConsent";
import {
  MAX_LEARNER_GOALS_CHARS,
  sanitizeChecklist,
  sanitizeLearnerGoals,
} from "@/lib/personalization";
import {
  ONBOARDING_TOTAL_STEPS,
  isOnboardingComplete,
  markOnboardingComplete,
  readOnboardingStep,
  writeOnboardingStep,
} from "@/lib/onboarding";

// ── Age helpers (same logic as the legacy consent modal) ─────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: 1, label: "Jan" }, { value: 2, label: "Feb" }, { value: 3, label: "Mar" },
  { value: 4, label: "Apr" }, { value: 5, label: "May" }, { value: 6, label: "Jun" },
  { value: 7, label: "Jul" }, { value: 8, label: "Aug" }, { value: 9, label: "Sep" },
  { value: 10, label: "Oct" }, { value: 11, label: "Nov" }, { value: 12, label: "Dec" },
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

type AgeStatus = "unknown" | "under13" | "minor" | "adult";

function computeAgeStatus(year: number, month: number, day: number): AgeStatus {
  if (!year || !month || !day) return "unknown";
  const now = new Date();
  let age = now.getFullYear() - year;
  const m = now.getMonth() + 1;
  if (m < month || (m === month && now.getDate() < day)) age--;
  if (age < 13) return "under13";
  if (age < 18) return "minor";
  return "adult";
}

// ── Personalization slide content ────────────────────────────────────────────

const LEVEL_OPTIONS: { value: Level; label: string; hint: string }[] = [
  { value: "Class 6-8", label: "Class 6–8", hint: "Middle school" },
  { value: "Class 9-10", label: "Class 9–10", hint: "High school" },
  { value: "College / Advanced", label: "College / Advanced", hint: "And beyond" },
];

// A curated, glanceable subset of PERSONALIZATION_CHECKLIST_OPTIONS — every
// value must remain a valid checklist option (sanitizeChecklist enforces it).
const STYLE_OPTIONS = [
  "Explain step-by-step",
  "Include real-world examples",
  "Use simple language and short sentences",
  "Use visual analogies",
  "Add more practice questions",
  "I prefer concise, direct answers",
];

const STEP_LABELS = ["Welcome", "The basics", "Your account", "Make it yours", "Ready"];

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signIn } = useSignIn();

  const setLevelPref = usePreferenceStore((s) => s.setLevel);
  const setPersonalization = usePreferenceStore((s) => s.setPersonalization);
  const personalizationOnboarded = usePreferenceStore((s) => s.personalization.onboarded);

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");

  // Step 2 — legal + age
  const [dobYear, setDobYear] = useState(0);
  const [dobMonth, setDobMonth] = useState(0);
  const [dobDay, setDobDay] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [parentalAck, setParentalAck] = useState(false);

  // Step 3 — account
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthError, setOauthError] = useState(false);

  // Step 4 — personalization
  const [level, setLevel] = useState<Level>("Class 9-10");
  const [goal, setGoal] = useState("");
  const [styles, setStyles] = useState<string[]>([]);

  const slideRef = useRef<HTMLDivElement>(null);
  const skipInitialFocus = useRef(true);

  const ageStatus = useMemo(
    () => computeAgeStatus(dobYear, dobMonth, dobDay),
    [dobYear, dobMonth, dobDay]
  );
  const dayOptions = useMemo(() => {
    if (!dobYear || !dobMonth) return Array.from({ length: 31 }, (_, i) => i + 1);
    return Array.from({ length: daysInMonth(dobYear, dobMonth) }, (_, i) => i + 1);
  }, [dobYear, dobMonth]);

  // ── Resume position after refresh / OAuth round-trip ───────────────────────
  useEffect(() => {
    if (!isLoaded || ready) return;

    if (isOnboardingComplete()) {
      router.replace("/");
      return;
    }

    const consentOk = isConsentCurrent(readLegalConsent());

    // Furthest slide the user has EARNED (never lets a stored value skip ahead).
    let unlocked = 2; // welcome never re-blocks a returning visitor
    if (consentOk) unlocked = 3;
    if (consentOk && isSignedIn) unlocked = 4;
    if (consentOk && isSignedIn && personalizationOnboarded) unlocked = 5;

    const stored = readOnboardingStep();
    let start = Math.min(Math.max(stored, 1), unlocked);
    // Coming back from Google with the account created → move to the next slide.
    if (start === 3 && consentOk && isSignedIn) start = 4;

    setStep(start);
    setReady(true);
  }, [isLoaded, isSignedIn, personalizationOnboarded, ready, router]);

  // Persist position so redirects/refreshes resume on the same slide.
  useEffect(() => {
    if (ready) writeOnboardingStep(step);
  }, [ready, step]);

  // Move focus to the fresh slide for keyboard / screen-reader users.
  useEffect(() => {
    if (!ready) return;
    if (skipInitialFocus.current) {
      skipInitialFocus.current = false;
      return;
    }
    slideRef.current?.focus({ preventScroll: true });
  }, [ready, step]);

  // A consent accepted while anonymous (slide 2) has no server record yet.
  // Once the user signs in (slide 3), tie that existing explicit consent to
  // the account — same best-effort sync the legacy modal performs.
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;
    const consent = readLegalConsent();
    if (!isConsentCurrent(consent) || consent?.syncedClerkId === user.id) return;
    let cancelled = false;
    syncLegalConsentToBackend(getToken, consent).then((ok) => {
      if (cancelled || !ok) return;
      writeLegalConsent({ ...(consent as LegalConsentState), syncedClerkId: user.id });
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user?.id, getToken]);

  // Browser Back from the Google screen can restore this page from the
  // back/forward cache with oauthBusy still true — the button would read
  // "Opening Google…" forever. pageshow(persisted) is that exact signal.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setOauthBusy(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const goTo = useCallback((next: number, dir: "fwd" | "back") => {
    setDirection(dir);
    setStep(Math.min(Math.max(next, 1), ONBOARDING_TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => goTo(step - 1, "back"), [goTo, step]);

  // ── Step actions ───────────────────────────────────────────────────────────

  const canAcceptLegal =
    agreed && (ageStatus === "adult" || (ageStatus === "minor" && parentalAck));

  const acceptLegal = () => {
    if (!canAcceptLegal) return;
    writeLegalConsent({
      accepted: true,
      timestamp: new Date().toISOString(),
      privacyVersion: CURRENT_PRIVACY_VERSION,
      termsVersion: CURRENT_TERMS_VERSION,
      // Privacy: only the bracket is stored, never the exact date of birth.
      ageBracket: ageStatus === "minor" ? "13-17" : "18+",
    });
    goTo(3, "fwd");
  };

  const startGoogleSignIn = async () => {
    if (!signIn || oauthBusy) return;
    setOauthBusy(true);
    setOauthError(false);
    try {
      // Clerk v7 "future" sign-in API: sso() covers both existing accounts
      // and brand-new ones (the transfer flow completes on the callback
      // route). On success the browser navigates away to Google.
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: "/onboarding",
        redirectCallbackUrl: "/onboarding/sso-callback",
      });
      if (error) {
        setOauthBusy(false);
        setOauthError(true);
      }
    } catch {
      setOauthBusy(false);
      setOauthError(true);
    }
  };

  const savePersonalization = (skipped: boolean) => {
    if (!skipped) {
      setLevelPref(level);
      setPersonalization({
        checklist: sanitizeChecklist(styles),
        notes: "",
        goals: sanitizeLearnerGoals(goal),
        onboarded: true,
      });
    } else {
      setPersonalization({ checklist: [], notes: "", goals: "", onboarded: true });
    }
    goTo(5, "fwd");
  };

  const finish = () => {
    markOnboardingComplete();
    router.push("/");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <main className="onboarding-canvas" aria-busy="true">
        <div className="onboarding-card onboarding-card--loading">
          <div className="onboarding-spinner" aria-hidden="true" />
          <p className="onboarding-loading-text">Getting things ready…</p>
        </div>
      </main>
    );
  }

  const selectProps = { className: "onboarding-select" };

  return (
    <main className="onboarding-canvas">
      <div className="onboarding-card">
        {/* Progress — always visible, screen-reader friendly */}
        <div className="onboarding-progress">
          <div className="onboarding-progress__meta">
            <span className="section-overline">{STEP_LABELS[step - 1]}</span>
            <span
              className="onboarding-progress__count"
              aria-label={`Step ${step} of ${ONBOARDING_TOTAL_STEPS}`}
            >
              Step {step} of {ONBOARDING_TOTAL_STEPS}
            </span>
          </div>
          <div
            className="onboarding-progress__track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={ONBOARDING_TOTAL_STEPS}
            aria-valuenow={step}
            aria-valuetext={`Step ${step} of ${ONBOARDING_TOTAL_STEPS}: ${STEP_LABELS[step - 1]}`}
          >
            {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`onboarding-progress__seg${
                  i < step ? " onboarding-progress__seg--done" : ""
                }`}
              />
            ))}
          </div>
        </div>

        <div
          key={step}
          ref={slideRef}
          tabIndex={-1}
          className={`onboarding-slide onboarding-slide--${direction}`}
        >
          {/* ── 1 · Welcome ── */}
          {step === 1 && (
            <>
              <div className="onboarding-glyph" aria-hidden="true">
                <Icon name="sparkle" size={26} />
              </div>
              <h1 className="onboarding-title">Welcome to RealLearn</h1>
              <p className="onboarding-sub">
                Ask any question — big or small — and RealLearn turns it into a
                short, friendly lesson made just for you.
              </p>
              <ul className="onboarding-points">
                <li>
                  <Icon name="message-circle" size={18} aria-hidden="true" />
                  <span>
                    <strong>Ask anything.</strong> From fractions to the French
                    Revolution — no question is too simple.
                  </span>
                </li>
                <li>
                  <Icon name="layers" size={18} aria-hidden="true" />
                  <span>
                    <strong>Learn step by step.</strong> Clear parts, your pace,
                    and a tiny quiz to unlock the next one.
                  </span>
                </li>
                <li>
                  <Icon name="heart" size={18} aria-hidden="true" />
                  <span>
                    <strong>Made for you.</strong> Lessons adapt to your level,
                    language, and goals.
                  </span>
                </li>
              </ul>
              <div className="onboarding-actions">
                <span className="onboarding-hint">
                  <Icon name="clock" size={14} aria-hidden="true" /> Setup takes
                  about 2 minutes
                </span>
                <button type="button" className="btn-primary" onClick={() => goTo(2, "fwd")}>
                  Let&apos;s get started
                  <Icon name="arrow-right" size={16} aria-hidden="true" />
                </button>
              </div>
              <p className="onboarding-footnote">
                Already have an account?{" "}
                <Link href="/sign-in">Sign in</Link>
              </p>
            </>
          )}

          {/* ── 2 · Under-13 terminal state ── the DOB rules us out, so the
              form is replaced with a clear, kind end point instead of a
              stranded disabled slide. Back clears the day so a typo can be
              fixed without retyping everything. */}
          {step === 2 && ageStatus === "under13" && (
            <>
              <div className="onboarding-glyph" aria-hidden="true">
                <Icon name="heart" size={26} />
              </div>
              <h1 className="onboarding-title">We&apos;ll see you at 13</h1>
              <p className="onboarding-sub" role="alert">
                RealLearn is designed for learners aged 13 and older, so we
                can&apos;t create an account for you just yet. We&apos;d love
                to welcome you back on your 13th birthday — the questions will
                still be here.
              </p>
              <div className="onboarding-actions">
                <button type="button" className="btn-ghost" onClick={() => setDobDay(0)}>
                  <Icon name="arrow-left" size={16} aria-hidden="true" /> Back
                </button>
                {/* Mark the wizard done on this device, or OnboardingRedirect
                    would bounce "/" straight back here. Signing in later still
                    re-gates age + consent via the legacy consent flow. */}
                <Link href="/" className="btn-primary" onClick={() => markOnboardingComplete()}>
                  Back to home
                </Link>
              </div>
              <p className="onboarding-footnote">
                Picked the wrong date? Use Back to fix it.
              </p>
            </>
          )}

          {/* ── 2 · Legal + Age ── */}
          {step === 2 && ageStatus !== "under13" && (
            <>
              <h1 className="onboarding-title">First, the basics</h1>
              <p className="onboarding-sub">
                Two quick things so we can keep RealLearn safe for everyone.
              </p>

              <fieldset className="onboarding-fieldset">
                <legend>When were you born?</legend>
                <div className="onboarding-dob">
                  <select
                    {...selectProps}
                    aria-label="Year"
                    value={dobYear}
                    onChange={(e) => {
                      setDobYear(Number(e.target.value));
                      setDobDay(0);
                    }}
                  >
                    <option value={0}>Year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select
                    {...selectProps}
                    aria-label="Month"
                    value={dobMonth}
                    onChange={(e) => {
                      setDobMonth(Number(e.target.value));
                      setDobDay(0);
                    }}
                  >
                    <option value={0}>Month</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    {...selectProps}
                    aria-label="Day"
                    value={dobDay}
                    onChange={(e) => setDobDay(Number(e.target.value))}
                  >
                    <option value={0}>Day</option>
                    {dayOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {ageStatus === "minor" && (
                  <label className="onboarding-check">
                    <input
                      type="checkbox"
                      checked={parentalAck}
                      onChange={(e) => setParentalAck(e.target.checked)}
                    />
                    <span>
                      My parent or guardian has reviewed and approved my use of
                      RealLearn, in line with the{" "}
                      <a href="/legal?tab=privacy" target="_blank" rel="noreferrer">
                        Privacy Policy
                      </a>.
                    </span>
                  </label>
                )}
              </fieldset>

              <label className="onboarding-check onboarding-check--boxed">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  I agree to the{" "}
                  <a href="/legal?tab=privacy" target="_blank" rel="noreferrer">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="/legal?tab=terms" target="_blank" rel="noreferrer">
                    Terms of Service
                  </a>{" "}
                  (they open in a new tab, so you won&apos;t lose your place).
                </span>
              </label>

              <div className="onboarding-actions">
                <button type="button" className="btn-ghost" onClick={goBack}>
                  <Icon name="arrow-left" size={16} aria-hidden="true" /> Back
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canAcceptLegal}
                  onClick={acceptLegal}
                >
                  Continue
                  <Icon name="arrow-right" size={16} aria-hidden="true" />
                </button>
              </div>
              {!canAcceptLegal && (
                <p className="onboarding-footnote" aria-live="polite">
                  {ageStatus === "unknown"
                    ? "Add your date of birth to continue."
                    : ageStatus === "minor" && !parentalAck
                      ? "Tick both boxes above to continue."
                      : "Tick the agreement box to continue."}
                </p>
              )}
            </>
          )}

          {/* ── 3 · Account ── */}
          {step === 3 && (
            <>
              <h1 className="onboarding-title">Create your account</h1>
              {isSignedIn ? (
                <>
                  <p className="onboarding-sub">You&apos;re all signed in — nice!</p>
                  <div className="onboarding-signed-in">
                    <span className="onboarding-signed-in__badge">
                      <Icon name="check" size={16} aria-hidden="true" />
                    </span>
                    <span>
                      Signed in as{" "}
                      <strong>
                        {user?.primaryEmailAddress?.emailAddress ||
                          user?.fullName ||
                          "your Google account"}
                      </strong>
                    </span>
                  </div>
                  <div className="onboarding-actions">
                    <button type="button" className="btn-ghost" onClick={goBack}>
                      <Icon name="arrow-left" size={16} aria-hidden="true" /> Back
                    </button>
                    <button type="button" className="btn-primary" onClick={() => goTo(4, "fwd")}>
                      Continue
                      <Icon name="arrow-right" size={16} aria-hidden="true" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="onboarding-sub">
                    One click with Google — your progress and lessons will be
                    saved to your account. No new password to remember.
                  </p>
                  <button
                    type="button"
                    className="onboarding-google-btn"
                    onClick={startGoogleSignIn}
                    disabled={!signIn || oauthBusy}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    {oauthBusy ? "Opening Google…" : "Continue with Google"}
                  </button>
                  {oauthError && (
                    <p className="onboarding-error" role="alert">
                      Hmm, that didn&apos;t work. Please try again, or{" "}
                      <Link href="/sign-in?redirect_url=%2Fonboarding">
                        use the classic sign-in page
                      </Link>.
                    </p>
                  )}
                  <p className="onboarding-footnote">
                    Prefer email instead?{" "}
                    <Link href="/sign-in?redirect_url=%2Fonboarding">Sign in another way</Link>
                  </p>
                  <div className="onboarding-actions">
                    <button type="button" className="btn-ghost" onClick={goBack}>
                      <Icon name="arrow-left" size={16} aria-hidden="true" /> Back
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── 4 · Personalize ── */}
          {step === 4 && (
            <>
              <h1 className="onboarding-title">Make it yours</h1>
              <p className="onboarding-sub">
                A few quick picks so lessons fit you from day one. You can change
                any of this later in Settings.
              </p>

              <div className="onboarding-field">
                <span className="onboarding-label" id="onb-level-label">
                  What are you studying at?
                </span>
                <div
                  className="onboarding-choice-row"
                  role="radiogroup"
                  aria-labelledby="onb-level-label"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={level === opt.value}
                      className={`onboarding-choice${
                        level === opt.value ? " onboarding-choice--on" : ""
                      }`}
                      onClick={() => setLevel(opt.value)}
                    >
                      <strong>{opt.label}</strong>
                      <small>{opt.hint}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label" htmlFor="onb-goal">
                  What would you love to get better at?{" "}
                  <span className="onboarding-label__optional">(optional)</span>
                </label>
                <textarea
                  id="onb-goal"
                  className="onboarding-textarea"
                  rows={2}
                  value={goal}
                  maxLength={MAX_LEARNER_GOALS_CHARS}
                  placeholder="For example: get confident with fractions, or crack JEE Physics…"
                  onChange={(e) => setGoal(sanitizeLearnerGoals(e.target.value))}
                />
              </div>

              <div className="onboarding-field">
                <span className="onboarding-label" id="onb-style-label">
                  How do you like to learn?{" "}
                  <span className="onboarding-label__optional">(pick any)</span>
                </span>
                <div
                  className="onboarding-chip-row"
                  role="group"
                  aria-labelledby="onb-style-label"
                >
                  {STYLE_OPTIONS.map((opt) => {
                    const on = styles.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={on}
                        className={`onboarding-chip${on ? " onboarding-chip--on" : ""}`}
                        onClick={() =>
                          setStyles((prev) =>
                            on ? prev.filter((s) => s !== opt) : [...prev, opt]
                          )
                        }
                      >
                        {on && <Icon name="check" size={13} aria-hidden="true" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="onboarding-actions">
                <button type="button" className="btn-ghost" onClick={goBack}>
                  <Icon name="arrow-left" size={16} aria-hidden="true" /> Back
                </button>
                <div className="onboarding-actions__end">
                  <button
                    type="button"
                    className="onboarding-skip"
                    onClick={() => savePersonalization(true)}
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => savePersonalization(false)}
                  >
                    Continue
                    <Icon name="arrow-right" size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── 5 · Ready ── */}
          {step === 5 && (
            <>
              <div className="onboarding-glyph onboarding-glyph--party" aria-hidden="true">
                <Icon name="party" size={26} />
              </div>
              <h1 className="onboarding-title">You&apos;re all set!</h1>
              <p className="onboarding-sub">
                That&apos;s everything. Ask your first question and watch it turn
                into a lesson made just for you.
              </p>
              <ul className="onboarding-points">
                <li>
                  <Icon name="lightbulb" size={18} aria-hidden="true" />
                  <span>
                    <strong>Try asking:</strong> “Why is the sky blue?” or “How
                    do vaccines work?”
                  </span>
                </li>
                <li>
                  <Icon name="settings" size={18} aria-hidden="true" />
                  <span>
                    <strong>Change anything anytime</strong> — language, level,
                    and goals live in Settings.
                  </span>
                </li>
              </ul>
              <div className="onboarding-actions">
                <button type="button" className="btn-ghost" onClick={goBack}>
                  <Icon name="arrow-left" size={16} aria-hidden="true" /> Back
                </button>
                <button type="button" className="btn-primary" onClick={finish}>
                  Start learning
                  <Icon name="rocket" size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
