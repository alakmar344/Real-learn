"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  isConsentCurrent,
  readLegalConsent,
  syncLegalConsentToBackend,
  writeLegalConsent,
  type LegalConsentState,
} from "@/lib/legalConsent";

const ALLOWED_PATHS_WHEN_DECLINED = ["/sign-in", "/sign-up", "/legal"];

const POLICY_CHANGES = [
  "Privacy Policy updated to version 2.6 — all users are re-prompted to re-accept.",
  "Optional anonymous feedback: the day after you complete your first lesson, RealLearn may invite an optional 1–10 star rating plus free-text notes on what you liked and what to improve. The review is submitted with no account identity and we store only the rating and review text — never your IP address, Clerk ID, or email. The prompt is optional, never forced, and is suppressed once you respond (or decline) via a local-only flag in localStorage.",
  "New locally-stored personalization data: the date you first used RealLearn on this device (shown as a \"learning together for N days\" counter), once-per-day markers so seasonal or time-of-day greetings never appear twice in a day, and an on-screen greeting that may display your first name. All of this stays in your browser only — nothing is sent to our servers — and \"Delete My Data\" or clearing your browser data removes it.",
  "Saved lessons live in IndexedDB (since v2.4): the full content of every saved lesson (chat) is stored in your browser's IndexedDB on your own device, with only a lightweight history index (question, scores, dates) in localStorage. Nothing is sent to our servers, and re-opening a saved lesson loads it locally.",
  "IP addresses are anonymized before storage (since v2.3): consent records keep only a truncated network prefix (e.g. 203.0.113.0), never your full IP address.",
];

const TERMS_CHANGES = [
  "Terms of Service updated to version 2.4: your saved lesson history lives only on your device (full lesson content in browser IndexedDB, lightweight index in localStorage). Clearing your browser's site data removes your saved lessons and we cannot restore them — re-opening such an entry generates the lesson again.",
  "Optional feedback (new Section 22): the day after your first completed lesson, RealLearn may invite an optional 1–10 star rating plus free-text notes. The review is entirely optional and never required to use the Service; it is submitted anonymously (no account identity, no IP/Clerk ID/email stored), and a local flag prevents the prompt from reappearing once you respond or decline.",
];

// Build year/month options once
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
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

export default function PreSignInConsent() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const [showConsent, setShowConsent] = useState(false);
  const [showReacceptConsent, setShowReacceptConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [declined, setDeclined] = useState(false);
  // Age verification state
  const [dobYear, setDobYear] = useState<number>(0);
  const [dobMonth, setDobMonth] = useState<number>(0);
  const [dobDay, setDobDay] = useState<number>(0);
  const [parentalAck, setParentalAck] = useState(false);
  // A11y: this component renders blocking dialogs — keyboard focus must stay
  // inside them (one trap per possible dialog; only one is open at a time).
  const consentTrapRef = useFocusTrap<HTMLDivElement>(showConsent);
  const reacceptTrapRef = useFocusTrap<HTMLDivElement>(showReacceptConsent);
  const declinedTrapRef = useFocusTrap<HTMLDivElement>(declined && !showConsent && !showReacceptConsent);

  const ageStatus = useMemo(() => computeAgeStatus(dobYear, dobMonth, dobDay), [dobYear, dobMonth, dobDay]);
  const dayOptions = useMemo(() => {
    if (!dobYear || !dobMonth) return Array.from({ length: 31 }, (_, i) => i + 1);
    return Array.from({ length: daysInMonth(dobYear, dobMonth) }, (_, i) => i + 1);
  }, [dobYear, dobMonth]);

  useEffect(() => {
    const applyLocalRecord = (parsed: LegalConsentState | null) => {
      if (!parsed) {
        setShowConsent(true);
      } else if (isConsentCurrent(parsed)) {
        setShowConsent(false);
      } else if (parsed.accepted) {
        setShowReacceptConsent(true);
      } else {
        setDeclined(true);
        setShowConsent(false);
      }
    };

    const checkConsent = async () => {
      if (!isSignedIn && user === undefined) return;
      const parsed = readLegalConsent();

      // Anonymous visitors have no server record — rely on localStorage only.
      if (!isSignedIn) {
        applyLocalRecord(parsed);
        return;
      }

      // POLICY ACCEPTANCE QUERIES THE DB FIRST: for signed-in users the
      // server-side record is the source of truth (it survives a new device,
      // a localStorage wipe, or a re-login). Only when the DB lookup fails do
      // we fall back to the local record.
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com";
        // The status call needs a Clerk session token. In Firefox, Enhanced
        // Tracking Protection can delay or briefly block the session refresh
        // worker, so getToken() may reject on the first try even though the
        // user is signed in. Retry once before treating it as a real failure —
        // otherwise Firefox users whose DB consent is already current (e.g.
        // they accepted in Chrome) get wrongly re-prompted on every load.
        let token: string | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            token = await getToken();
            if (token) break;
          } catch {
            // wait a tick for Clerk to finish initialising, then retry
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${backendUrl}/api/legal-consent/status`, {
          method: "GET",
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          const mongoAccepted =
            data.accepted &&
            data.privacyVersion === CURRENT_PRIVACY_VERSION &&
            data.termsVersion === CURRENT_TERMS_VERSION;

          if (mongoAccepted) {
            // Backend already has current consent — refresh the local record
            // so future loads skip this fetch.
            writeLegalConsent({
              accepted: true,
              timestamp: new Date().toISOString(),
              privacyVersion: CURRENT_PRIVACY_VERSION,
              termsVersion: CURRENT_TERMS_VERSION,
            });
            setShowConsent(false);
          } else if (parsed && isConsentCurrent(parsed)) {
            // The local record is ALREADY current (the user accepted v2.0 of
            // the PP/ToS in the pre-sign-in modal while anonymous, then just
            // signed in). The DB has no record yet because that anonymous save
            // couldn't POST without auth. Tie that EXISTING explicit consent to
            // the account instead of re-prompting for the same version.
            const email =
              user?.primaryEmailAddress?.emailAddress ||
              user?.emailAddresses?.[0]?.emailAddress ||
              "";
            const ok = await syncLegalConsentToBackend(getToken, parsed, email);
            if (ok && user?.id) {
              writeLegalConsent({
                accepted: true,
                timestamp: parsed.timestamp,
                privacyVersion: parsed.privacyVersion,
                termsVersion: parsed.termsVersion,
                syncedClerkId: user.id,
              });
            }
            setShowConsent(false);
          } else if (parsed?.accepted) {
            setShowReacceptConsent(true);
          } else {
            setShowConsent(true);
          }
        } else {
          applyLocalRecord(parsed);
        }
      } catch {
        // Verification failed (network hiccup, token/Clerk still initialising,
        // or Firefox tracking-protection blocking the session). A signed-in
        // user whose server consent is already current must NOT be kicked back
        // to the first-time Welcome modal just because this one check couldn't
        // complete — the effect re-runs whenever auth settles, and every
        // server-side write still enforces current consent. So: honor a local
        // current record if we have one, otherwise stay out of the way and let
        // the app render (the re-run will resolve it). Showing the blocking
        // first-time prompt here is exactly the Firefox-only "keeps re-asking"
        // bug, since Firefox keeps a separate localStorage from Chrome.
        if (isSignedIn) {
          if (isConsentCurrent(parsed)) {
            setShowConsent(false);
          }
          // else: leave the dialog closed and rely on the re-run / server
          // enforcement rather than forcing a spurious re-prompt.
        } else {
          applyLocalRecord(parsed);
        }
      }
    };

    checkConsent();
  }, [isSignedIn, getToken, user]);

  const saveConsent = async (accepted: boolean) => {
    setLoading(true);
    // Do NOT stamp syncedClerkId yet — it is only written after the backend
    // POST succeeds. Stamping it optimistically meant a failed POST (network
    // blip, cold start) left a record that claimed it was synced, so the
    // server-side consent record was permanently missing with no retry.
    const consent: LegalConsentState = {
      accepted,
      timestamp: new Date().toISOString(),
      privacyVersion: CURRENT_PRIVACY_VERSION,
      termsVersion: CURRENT_TERMS_VERSION,
      // Privacy: store only the age bracket, not the exact DOB.
      ageBracket:
        ageStatus === "under13" ? "under13" :
        ageStatus === "minor" ? "13-17" :
        ageStatus === "adult" ? "18+" : undefined,
    };

    writeLegalConsent(consent);

    if (accepted && isSignedIn) {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com";
        const token = await getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${backendUrl}/api/legal-consent`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            accepted: true,
            timestamp: consent.timestamp,
            email:
              user?.primaryEmailAddress?.emailAddress ||
              user?.emailAddresses?.[0]?.emailAddress ||
              "",
            privacyVersion: CURRENT_PRIVACY_VERSION,
            termsVersion: CURRENT_TERMS_VERSION,
          }),
        });
        if (response.ok && user?.id) {
          writeLegalConsent({ ...consent, syncedClerkId: user.id });
        }
      } catch {
        // best-effort — the home-page sync effect retries un-synced records
      }
    }

    setShowConsent(false);
    setShowReacceptConsent(false);
    setLoading(false);
    if (!accepted) {
      setDeclined(true);
    }
  };

  if (showConsent) {
    const canAccept = ageStatus === "adult" || (ageStatus === "minor" && parentalAck);
    const selectStyle: React.CSSProperties = {
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-sm)",
      padding: "8px 10px",
      fontSize: 14,
      background: "var(--bg-surface)",
      color: "var(--text-primary)",
      minHeight: 40,
      cursor: "pointer",
    };

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to RealLearn"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "var(--scrim, rgba(0,0,0,0.6))",
          backdropFilter: "blur(var(--blur-sm, 4px))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          ref={consentTrapRef}
          tabIndex={-1}
          className="animate-fade-up"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-xl)",
            padding: "32px 28px",
            maxWidth: 560,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 22,
              marginBottom: 12,
            }}
          >
            Welcome to RealLearn
          </h2>

          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
            <p style={{ marginBottom: 12 }}>
              RealLearn turns any question into a friendly, structured learning
              journey: <strong>Foundation</strong>, <strong>Mechanism</strong>, and{" "}
              <strong>Real World</strong>. You read at your own pace, then a short
              quiz unlocks the next part — no pressure, no trick questions.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>What we keep:</strong> your email (for sign-in), the questions
              you ask, quiz scores, your language and level, and consent timestamps.
              Your saved lessons stay in your browser. You can export or delete
              everything anytime from Settings.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>A safe space to learn:</strong> RealLearn includes gentle
              automated safeguards to help keep lessons appropriate and on-topic.
            </p>
          </div>

          {/* Age verification */}
          <fieldset
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <legend style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", padding: "0 6px" }}>
              Date of birth
            </legend>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                aria-label="Year"
                value={dobYear}
                onChange={(e) => {
                  setDobYear(Number(e.target.value));
                  setDobDay(0);
                }}
                style={selectStyle}
              >
                <option value={0}>Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                aria-label="Month"
                value={dobMonth}
                onChange={(e) => {
                  setDobMonth(Number(e.target.value));
                  setDobDay(0);
                }}
                style={selectStyle}
              >
                <option value={0}>Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                aria-label="Day"
                value={dobDay}
                onChange={(e) => setDobDay(Number(e.target.value))}
                style={selectStyle}
              >
                <option value={0}>Day</option>
                {dayOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {ageStatus === "under13" && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--wrong)", lineHeight: 1.5 }}>
                RealLearn is designed for learners aged 13 and older. We cannot create
                an account for you at this time. Thank you for your interest!
              </p>
            )}
            {ageStatus === "minor" && (
              <div style={{ marginTop: 10 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={parentalAck}
                    onChange={(e) => setParentalAck(e.target.checked)}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <span>
                    I confirm that my parent or guardian has reviewed and approved my
                    use of RealLearn, in accordance with our{" "}
                    <a href="/legal?tab=privacy" style={{ color: "var(--accent)" }} onClick={(e) => e.stopPropagation()}>
                      Privacy Policy
                    </a>.
                  </span>
                </label>
              </div>
            )}
          </fieldset>

          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
            By clicking <strong>Accept</strong>, you agree to our{" "}
            <a
              href="/legal?tab=privacy"
              style={{ color: "var(--accent)" }}
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="/legal?tab=terms"
              style={{ color: "var(--accent)" }}
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Service
            </a>.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => saveConsent(false)}
              disabled={loading}
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-secondary)",
                background: "transparent",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                minHeight: 44,
              }}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => saveConsent(true)}
              disabled={loading || !canAccept}
              style={{
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--on-accent)",
                background: "var(--accent)",
                cursor: loading || !canAccept ? "not-allowed" : "pointer",
                opacity: loading || !canAccept ? 0.5 : 1,
                minHeight: 44,
              }}
            >
              {loading ? "Saving..." : "Accept & Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showReacceptConsent) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Updated policies"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "var(--scrim, rgba(0,0,0,0.6))",
          backdropFilter: "blur(var(--blur-sm, 4px))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          ref={reacceptTrapRef}
          tabIndex={-1}
          className="animate-fade-up"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-xl)",
            padding: "32px 28px",
            maxWidth: 560,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 22,
              marginBottom: 12,
            }}
          >
            Updated Policies — Please Review
          </h2>

          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
            <p style={{ marginBottom: 12 }}>
              We have updated our Privacy Policy and Terms of Service. Please review the changes
              below and accept to continue using RealLearn.
            </p>

            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, marginTop: 16 }}>
              {`Privacy Policy changes (updated to v${CURRENT_PRIVACY_VERSION}):`}
            </h3>
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              {POLICY_CHANGES.map((change, index) => (
                <li key={`pp-${index}`} style={{ marginBottom: 6 }}>
                  {change}
                </li>
              ))}
            </ul>

            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, marginTop: 16 }}>
              {`Terms of Service changes (updated to v${CURRENT_TERMS_VERSION}):`}
            </h3>
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              {TERMS_CHANGES.map((change, index) => (
                <li key={`tos-${index}`} style={{ marginBottom: 6 }}>
                  {change}
                </li>
              ))}
            </ul>

            <p style={{ marginTop: 16 }}>
              By clicking <strong>Accept</strong>, you confirm that you agree to our updated{" "}
              <a
                href="/legal?tab=privacy"
                style={{ color: "var(--accent)" }}
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="/legal?tab=terms"
                style={{ color: "var(--accent)" }}
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </a>.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <a
              href="/legal?tab=privacy"
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-secondary)",
                textDecoration: "none",
                background: "transparent",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Review Policies
            </a>
            <button
              type="button"
              onClick={() => saveConsent(true)}
              disabled={loading}
              style={{
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--on-accent)",
                background: "var(--accent)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                minHeight: 44,
              }}
            >
              {loading ? "Saving..." : "Accept & Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (declined) {
    const isAllowedPath = ALLOWED_PATHS_WHEN_DECLINED.some((p) =>
      pathname?.startsWith(p)
    );
    if (isAllowedPath) return null;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="One quick step"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "var(--scrim, rgba(0,0,0,0.6))",
          backdropFilter: "blur(var(--blur-sm, 4px))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          ref={declinedTrapRef}
          tabIndex={-1}
          className="animate-fade-up"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-xl)",
            padding: "32px 28px",
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 22,
              marginBottom: 12,
            }}
          >
            Just one quick step
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.7 }}>
            To start learning, we just need you to agree to our Privacy Policy and
            Terms of Service. Take a look whenever you&apos;re ready — we&apos;ll be
            right here.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a
              href="/legal?tab=privacy"
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-secondary)",
                textDecoration: "none",
                background: "transparent",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Review Policies
            </a>
            <button
              type="button"
              onClick={() => {
                setDeclined(false);
                setShowConsent(true);
              }}
              style={{
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--on-accent)",
                background: "var(--accent)",
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
