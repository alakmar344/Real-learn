"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
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
  "Added a \"Who We Are\" section naming the data controller and a designated privacy / grievance contact.",
  "Added dedicated sections on Children's Privacy (COPPA), California privacy rights (CCPA/CPRA, including Global Privacy Control support), and India's DPDP Act (grievance officer and Data Protection Board escalation).",
  "Expanded data-retention details for each data category and clarified international transfers, including the processors involved and safeguards such as Standard Contractual Clauses.",
  "Added a disclosure on automated AI content generation and moderation, confirming no legally significant automated decisions or advertising profiling.",
];

const TERMS_CHANGES = [
  "Added a dedicated \"Disclaimer of Warranties\" section (Service provided \"as is\" / \"as available\"), while preserving non-waivable statutory consumer rights.",
  "Clarified eligibility for minors, including verifiable parental-consent requirements under laws such as COPPA and India's DPDP Act.",
  "Renumbered later sections to accommodate the new warranty disclaimer.",
];

export default function PreSignInConsent() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const [showConsent, setShowConsent] = useState(false);
  const [showReacceptConsent, setShowReacceptConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [declined, setDeclined] = useState(false);
  // A11y: this component renders blocking dialogs — keyboard focus must stay
  // inside them (one trap per possible dialog; only one is open at a time).
  const consentTrapRef = useFocusTrap<HTMLDivElement>(showConsent);
  const reacceptTrapRef = useFocusTrap<HTMLDivElement>(showReacceptConsent);
  const declinedTrapRef = useFocusTrap<HTMLDivElement>(declined && !showConsent && !showReacceptConsent);

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
            Welcome to RealLearn 👋
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
              <strong>A safe space to learn:</strong> RealLearn is designed for
              learners aged 13 and up, and gentle automated safeguards help keep
              lessons appropriate and on-topic.
            </p>
            <p>
              By clicking <strong>Accept</strong>, you confirm you&apos;re at least 13
              years old and agree to our{" "}
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
