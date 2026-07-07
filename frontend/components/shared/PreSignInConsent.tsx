"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  isConsentCurrent,
  readLegalConsent,
  writeLegalConsent,
  type LegalConsentState,
} from "@/lib/legalConsent";

const ALLOWED_PATHS_WHEN_DECLINED = ["/sign-in", "/sign-up", "/legal"];

const POLICY_CHANGES = [
  "Added Legal Basis for Processing section (GDPR Article 6) with consent, legitimate interest, contractual necessity, and legal obligation bases.",
  "Added Automated Decision-Making section disclosing AI content generation, content moderation, rate limiting, and quiz scoring.",
  "Added Data Breach Notification section committing to 72-hour supervisory authority notification.",
  "Added CCPA section (California Consumer Privacy Act) with rights to know, delete, correct, opt-out, and non-discrimination.",
  "Added DPDP Act section (India Digital Personal Data Protection Act, 2023) with rights to access, correction, erasure, grievance redressal, and nomination.",
  "Enhanced International Transfers section with Standard Contractual Clauses reference.",
  "Updated data storage details to reference MongoDB Atlas.",
];

const TERMS_CHANGES = [
  "Added DPDP Act compliance section (Section 14) for Indian users with Data Fiduciary designation and grievance redressal.",
  "Added Warranty Disclaimer (Section 10): Service provided AS IS without warranties of any kind.",
  "Added Indemnification clause (Section 11): Users agree to indemnify RealLearn against claims arising from use.",
  "Added Dispute Resolution clause (Section 15): 30-day informal resolution period before formal legal action.",
  "Added Force Majeure clause (Section 16): Liability exclusions for events beyond reasonable control.",
  "Added Severability clause (Section 17): Invalid provisions modified minimally; remaining provisions continue.",
  "Added Entire Agreement clause (Section 18): These Terms plus Privacy and Cookie Policies constitute the full agreement.",
  "Enhanced Limitation of Liability with comprehensive damage type exclusions.",
];

export default function PreSignInConsent() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const [showConsent, setShowConsent] = useState(false);
  const [showReacceptConsent, setShowReacceptConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [declined, setDeclined] = useState(false);

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

      // BANDWIDTH: when the local record is accepted at the current versions,
      // trust it and skip the backend status round-trip entirely. The backend
      // is only consulted when the local record is missing or stale (e.g. a
      // returning user on a new device).
      if (!isSignedIn || isConsentCurrent(parsed)) {
        applyLocalRecord(parsed);
        return;
      }

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
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          className="animate-fade-up"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-xl)",
            padding: "36px 32px",
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
              fontSize: 24,
              marginBottom: 12,
              color: "var(--text-primary)",
            }}
          >
            Welcome to RealLearn
          </h2>

          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
            <p style={{ marginBottom: 12 }}>
              RealLearn is an AI-powered educational platform that turns any question into a
              structured 3-part learning journey: <strong>Foundation</strong>, <strong>Mechanism</strong>, and{" "}
              <strong>Real World</strong>. You learn by reading, then prove understanding through quizzes
              before unlocking deeper content.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>What we store:</strong> Your email address (via Clerk authentication), the
              questions you ask, your quiz scores, language/level preferences, consent timestamps,
              and your device IP address for security. Your saved lessons are stored locally in your
              browser.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>Kid safety &amp; guardrails:</strong> RealLearn is intended for users 13 and older.
              We employ automated content filters to block harmful, violent, sexually explicit,
              or illegal content. We do not allow content that promotes self-harm, hate speech,
              or dangerous activities.
            </p>
            <p>
              By clicking <strong>Accept</strong>, you confirm that you are at least 13 years old and
              agree to our{" "}
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

  if (showReacceptConsent) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          className="animate-fade-up"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-xl)",
            padding: "36px 32px",
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
              fontSize: 24,
              marginBottom: 12,
              color: "var(--text-primary)",
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
              Privacy Policy Changes (v1.2 to v{CURRENT_PRIVACY_VERSION}):
            </h3>
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              {POLICY_CHANGES.map((change, index) => (
                <li key={`pp-${index}`} style={{ marginBottom: 6 }}>
                  {change}
                </li>
              ))}
            </ul>

            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, marginTop: 16 }}>
              Terms of Service Changes (v1.2 to v{CURRENT_TERMS_VERSION}):
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
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          className="animate-fade-up"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-xl)",
            padding: "36px 32px",
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
              fontSize: 24,
              marginBottom: 12,
              color: "var(--text-primary)",
            }}
          >
            Consent Required
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.7 }}>
            You must accept our Privacy Policy and Terms of Service to use RealLearn.
            Please review our policies and accept to continue.
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
