"use client";

import { useEffect } from "react";
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_CONSENT_REVOKED_EVENT,
  hasAnalyticsConsent,
} from "@/lib/legalConsent";

const GA_MEASUREMENT_ID = "G-ECZSC4ZVCL";

function loadGtag() {
  if (typeof window === "undefined") return;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const name = cookie.split("=")[0]?.trim() ?? "";
      if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
        const domains = ["", `; domain=${window.location.hostname}`, `; domain=.${window.location.hostname}`];
        for (const domain of domains) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
        }
      }
    }
  } catch {
    // cookie access blocked — nothing to clean up
  }
}

export default function GoogleAnalytics() {
  useEffect(() => {
    // hasAnalyticsConsent() is versioned: an acceptance made under an older
    // cookie policy no longer counts, so GA stays off until re-consent.
    if (hasAnalyticsConsent()) {
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
  }, []);

  return null;
}
