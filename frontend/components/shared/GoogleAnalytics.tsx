"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_CONSENT_REVOKED_EVENT,
  CURRENT_COOKIE_VERSION,
  fetchCookieConsentStatus,
  hasAnalyticsConsent,
} from "@/lib/legalConsent";
import { parseCookie, stringifySetCookie } from "cookie";

// Security: the measurement id is interpolated into an inline <script> body
// and a script src URL below. Restrict it to the GA id character set so a
// malformed/tampered env value (e.g. one containing quotes) can never become
// script injection in the app origin.
const RAW_GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GA_MEASUREMENT_ID =
  RAW_GA_ID && /^[A-Za-z0-9_-]+$/.test(RAW_GA_ID) ? RAW_GA_ID : undefined;

function loadGtag() {
  if (typeof window === "undefined") return;
  if (!GA_MEASUREMENT_ID) return;

  // Clear a previous opt-out flag if the user re-consents.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;

  if (document.getElementById(`ga-script-${GA_MEASUREMENT_ID}`)) return;

  const script = document.createElement("script");
  script.id = `ga-script-${GA_MEASUREMENT_ID}`;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  const initScript = document.createElement("script");
  initScript.id = `ga-init-${GA_MEASUREMENT_ID}`;
  initScript.text = [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "gtag('js', new Date());",
    `gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });`,
  ].join("\n");
  document.head.appendChild(initScript);
}

/** Honour consent withdrawal immediately: set GA's documented opt-out flag
 * and delete its cookies (best-effort — first-party _ga* cookies only). */
function disableGtag() {
  if (typeof window === "undefined") return;
  if (!GA_MEASUREMENT_ID) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  try {
    const items = parseCookie(document.cookie);
    for (const name of Object.keys(items)) {
      if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
        const domains = [undefined, window.location.hostname, `.${window.location.hostname}`];
        for (const domain of domains) {
          document.cookie = stringifySetCookie({
            name,
            value: "",
            expires: new Date(0),
            path: "/",
            ...(domain ? { domain } : {}),
          });
        }
      }
    }
  } catch {
    // cookie access blocked — nothing to clean up
  }
}

export default function GoogleAnalytics() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    // Respect Global Privacy Control (GPC) signal — if the browser sends it,
    // never load analytics regardless of stored consent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((navigator as any).globalPrivacyControl) {
      disableGtag();
      return;
    }

    // Consent gating — opt-IN by default for non-essential analytics (GDPR /
    // ePrivacy). The decision source depends on auth state:
    //
    //  • Anonymous: only localStorage (a pre-login cookie choice) applies.
    //  • Signed-in: ONLY the server-side DB record is valid. A pre-login
    //    localStorage acceptance is NOT tied to this account and must never
    //    auto-enable analytics — we deliberately ignore hasAnalyticsConsent()
    //    here and gate solely on the DB record.
    if (isSignedIn) {
      // Query the DB FIRST. On any failure (network error, no record yet,
      // stale version) we DENY by default — never load analytics.
      fetchCookieConsentStatus(getToken)
        .then((db) => {
          if (db?.accepted && db.cookieVersion === CURRENT_COOKIE_VERSION) {
            loadGtag();
          } else {
            // Deny = actively turn GA OFF, don't just skip loading. GA may
            // already be running from a pre-login localStorage acceptance (or
            // was revoked on another device); for a signed-in user only the DB
            // record is authoritative, so a non-accepting record must stop it.
            disableGtag();
          }
        })
        .catch(() => {
          // Deny by default on any failure — and stop GA if it was already
          // loaded, rather than leaving it running unconsented.
          disableGtag();
        });
    } else if (hasAnalyticsConsent()) {
      // Versioned: an acceptance made under an older cookie policy no longer
      // counts, so GA stays off until re-consent.
      loadGtag();
    }

    const handleConsent = () => loadGtag();
    const handleRevoke = () => disableGtag();

    window.addEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, handleConsent);
    window.addEventListener(COOKIE_CONSENT_REVOKED_EVENT, handleRevoke);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, handleConsent);
      window.removeEventListener(COOKIE_CONSENT_REVOKED_EVENT, handleRevoke);
    };
  }, [isSignedIn, getToken]);

  return null;
}
