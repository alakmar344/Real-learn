import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_CONSENT_REVOKED_EVENT,
  COOKIE_SETTINGS_OPEN_EVENT,
  CURRENT_COOKIE_VERSION,
  fetchCookieConsentStatus,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/legalConsent";
import { BACKEND_URL } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

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
  const { t } = useTranslation();
  const { isSignedIn, getToken } = useAuth();
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      try {
        if (isSignedIn) {
          const db = await fetchCookieConsentStatus(getToken);
          if (cancelled) return;
          if (db && db.accepted && db.cookieVersion === CURRENT_COOKIE_VERSION) {
            // Mirror the server record into localStorage (copy down, not up).
            const local = readCookieConsent();
            if (!local || local.cookieVersion !== CURRENT_COOKIE_VERSION) {
              writeCookieConsent(true);
            }
            setShowBanner(false);
          } else {
            // No current server acceptance → prompt (deny until explicit).
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
      } catch (err) {
        console.error("[CookieConsent] Failed to evaluate consent status", err);
        // Default to showing banner on error
        setShowBanner(true);
      }
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

      const backendUrl = BACKEND_URL;

      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // The backend derives identity (clerkId) and email exclusively from the
      // verified Clerk JWT token and records req.ip itself — the client sends
      // only the choice and timestamp.
      const response = await fetch(`${backendUrl}/api/agreement`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          accepted,
          timestamp: consent.timestamp,
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

  // The onboarding wizard keeps each slide to ONE action — hold the banner
  // until the user lands in the app (analytics never load without consent
  // anyway, so deferring the prompt is compliant-by-default).
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <div role="region" aria-label={t("cookie.title")} className="cookie-banner">
      <div className="cookie-banner__inner">
        <div className="cookie-banner__copy">
          <p className="cookie-banner__title">{t("cookie.title")}</p>
          <p className="cookie-banner__body">
            {t("cookie.body")}{" "}
            <Link href="/legal/cookies">{t("cookie.policy")}</Link>
          </p>
        </div>
        <div className="cookie-banner__actions">
          <button
            onClick={() => saveConsent(false)}
            disabled={loading}
            className="cookie-banner__btn cookie-banner__btn--secondary"
          >
            {t("cookie.decline")}
          </button>
          <button
            onClick={() => saveConsent(true)}
            disabled={loading}
            className="cookie-banner__btn cookie-banner__btn--primary"
          >
            {loading ? t("cookie.saving") : t("cookie.allow")}
          </button>
        </div>
      </div>
    </div>
  );
}
