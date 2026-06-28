"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

const LEGAL_CONSENT_KEY = "reallearn-legal-consent";

interface LegalConsentState {
  accepted: boolean;
  timestamp: string;
}

const ALLOWED_PATHS_WHEN_DECLINED = ["/sign-in", "/sign-up", "/legal"];

export default function PreSignInConsent() {
  const { isSignedIn, getToken } = useAuth();
  const pathname = usePathname();
  const [showConsent, setShowConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LEGAL_CONSENT_KEY);
    if (!stored) {
      setShowConsent(true);
    } else {
      try {
        const parsed = JSON.parse(stored) as LegalConsentState;
        if (parsed.accepted) {
          setShowConsent(false);
        } else {
          setDeclined(true);
          setShowConsent(false);
        }
      } catch {
        setShowConsent(true);
      }
    }
  }, []);

  const saveConsent = async (accepted: boolean) => {
    setLoading(true);
    const consent: LegalConsentState = {
      accepted,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem(LEGAL_CONSENT_KEY, JSON.stringify(consent));
    } catch {
      // ignore storage errors
    }

    if (accepted && isSignedIn) {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";
        const token = await getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        await fetch(`${backendUrl}/api/legal-consent`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            accepted: true,
            timestamp: consent.timestamp,
          }),
        });
      } catch {
        // best-effort
      }
    }

    setShowConsent(false);
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
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
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
                color: "#faf7f2",
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
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
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
                color: "#faf7f2",
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
