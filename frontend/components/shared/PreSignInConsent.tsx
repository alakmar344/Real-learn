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
  "Moderation logs now auto-delete after at most 90 days via a database-level expiry (TTL) rule — previously they were kept until account deletion.",
  "Clarified exactly what a moderation log contains: the reason content was flagged and the flagged question (capped at 500 characters), with a pseudonymous account identifier — never your email, IP address, or internal error details.",
  "Updated the Data Retention section to reflect the new 90-day moderation-log limit; account and consent records remain stored only until you delete your account.",
];

const TERMS_CHANGES = [
  "The Content Moderation section now discloses what is recorded when content is flagged (flag reason + submitted question, capped at 500 characters) and that these records auto-delete after at most 90 days.",
  "The Data Retention section now states the 90-day automatic expiry of moderation log entries.",
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
        const token = await getToken();
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
        applyLocalRecord(parsed);
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
              fontFamily: "var(--font-playfair)",
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
              fontFamily: "var(--font-playfair)",
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
              Privacy Policy changes (updated to v{CURRENT_PRIVACY_VERSION}):
            </h3>
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              {POLICY_CHANGES.map((change, index) => (
                <li key={`pp-${index}`} style={{ marginBottom: 6 }}>
                  {change}
                </li>
              ))}
            </ul>

            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, marginTop: 16 }}>
              Terms of Service changes (updated to v{CURRENT_TERMS_VERSION}):
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
              fontFamily: "var(--font-playfair)",
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
