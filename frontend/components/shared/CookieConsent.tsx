"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_CONSENT_REVOKED_EVENT,
  COOKIE_SETTINGS_OPEN_EVENT,
  CURRENT_COOKIE_VERSION,
  fetchCookieConsentStatus,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/legalConsent";

/**
 * Cookie/analytics consent banner.
 *
 * Compliance notes (ePrivacy / GDPR):
 * - Shown to EVERY visitor, signed in or not — analytics never load until the
 *   person using this browser has opted in.
 * - Versioned: bumping CURRENT_COOKIE_VERSION re-prompts everyone, and an
 *   acceptance made under an older policy no longer counts as consent.
 * - Revocable: the settings page (and any component) can re-open this banner
 *   via the COOKIE_SETTINGS_OPEN_EVENT, and declining after a previous accept
 *   dispatches COOKIE_CONSENT_REVOKED_EVENT so analytics shut off immediately.
 */
export default function CookieConsent() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      // Signed-in users: the DB record is the source of truth and is queried
      // FIRST. This survives a localStorage wipe / re-login (where the local
      // "cookie acceptance is gone") so the banner doesn't wrongly re-prompt
      // someone who already accepted, and so analytics can be re-enabled from
      // the server record.
      if (isSignedIn) {
        const db = await fetchCookieConsentStatus(getToken);
        if (cancelled) return;
        if (db && db.accepted && db.cookieVersion === CURRENT_COOKIE_VERSION) {
          // Mirror the server record into localStorage so the analytics gate
          // and settings page (which still read local state) stay in sync.
          const local = readCookieConsent();
          if (!local || local.cookieVersion !== CURRENT_COOKIE_VERSION) {
            writeCookieConsent(true);
          }
          setShowBanner(false);
        } else {
          // No current server acceptance → prompt.
          setShowBanner(true);
        }
        return;
      }

      // Anonymous visitors have no server record — fall back to localStorage.
      // readCookieConsent uses safeGetItem: raw localStorage access throws
      // (and unmounted the whole app) when storage is blocked — private mode,
      // "Block all cookies".
      const stored = readCookieConsent();
      // No choice yet, or a choice made under an older cookie policy → prompt.
      setShowBanner(!stored || stored.cookieVersion !== CURRENT_COOKIE_VERSION);
    };

    evaluate();

    const openSettings = () => setShowBanner(true);
    window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);
    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, openSettings);
    };
    // Re-check when auth state changes: after account deletion + re-login,
    // localStorage is cleared but this component may already be mounted.
    // isSignedIn changing from false → true triggers a fresh check.
  }, [isSignedIn, getToken]);

  const saveConsent = async (accepted: boolean) => {
    setLoading(true);

    // Dismiss the banner immediately once the user makes a choice. Persisting
    // the consent to the backend is best-effort and must never keep the banner
    // on screen if it fails (e.g. network/CORS/auth error).
    const previous = readCookieConsent();
    const consent = writeCookieConsent(accepted);
    setShowBanner(false);

    // Fire the coordination events BEFORE the network round-trip so analytics
    // react instantly to the user's choice.
    if (accepted) {
      window.dispatchEvent(new Event(COOKIE_CONSENT_ACCEPTED_EVENT));
    } else if (previous?.accepted) {
      // Withdrawal must be as effective as granting: shut analytics off now.
      window.dispatchEvent(new Event(COOKIE_CONSENT_REVOKED_EVENT));
    }

    try {
      // Server-side consent records are only possible for signed-in users;
      // anonymous choices live in localStorage alone (no identifier to key on).
      if (!isSignedIn) return;

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com";

      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Note: the backend derives identity (clerkId) exclusively from
      // the verified token and records req.ip itself — the client sends
      // the choice, timestamp, and email (for the consent record).
      const email =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        "";
      const response = await fetch(`${backendUrl}/api/agreement`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          accepted,
          timestamp: consent.timestamp,
          email,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.error("[CookieConsent] Backend rejected consent", {
          status: response.status,
          payload,
        });
      }
    } catch (err) {
      console.error("[CookieConsent] Failed to save consent", err);
    } finally {
      setLoading(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "var(--bg-glass, var(--bg-card))",
        backdropFilter: "blur(var(--blur-md, 12px))",
        borderTop: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-lg)",
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1024,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "var(--text-primary)",
              fontFamily: "var(--font-inter)",
              fontWeight: 500,
            }}
          >
            A quick choice about analytics 🍪
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-lora)",
            }}
          >
            We&apos;d like to use Google Analytics to understand what helps people
            learn. Nothing loads until you say yes, and you can change your mind
            anytime in Settings.{" "}
            <Link href="/legal/cookies" style={{ color: "var(--accent)" }}>
              Cookie Policy
            </Link>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => saveConsent(false)}
            disabled={loading}
            style={{
              border: "2px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              background: "var(--bg-surface)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              minHeight: 44,
            }}
          >
            No thanks
          </button>
          <button
            onClick={() => saveConsent(true)}
            disabled={loading}
            style={{
              border: "2px solid var(--accent)",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--on-accent)",
              background: "var(--accent)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              minHeight: 44,
            }}
          >
            {loading ? "Saving..." : "Allow analytics"}
          </button>
        </div>
      </div>
    </div>
  );
}
