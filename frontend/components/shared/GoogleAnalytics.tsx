"use client";

import { useEffect } from "react";

const GA_MEASUREMENT_ID = "G-ECZSC4ZVCL";
const COOKIE_CONSENT_KEY = "reallearn-cookie-consent";

function loadGtag() {
  if (typeof window === "undefined") return;
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

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored) as { accepted: boolean };
    return parsed.accepted === true;
  } catch {
    return false;
  }
}

export default function GoogleAnalytics() {
  useEffect(() => {
    if (hasConsent()) {
      loadGtag();
      return;
    }

    const handleConsent = () => {
      loadGtag();
    };

    window.addEventListener("cookie-consent-accepted", handleConsent);
    return () => {
      window.removeEventListener("cookie-consent-accepted", handleConsent);
    };
  }, []);

  return null;
}
