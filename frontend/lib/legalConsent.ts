// Shared legal-consent constants + storage helpers.
//
// The consent record is read/written from several components (PreSignInConsent,
// CookieConsent, the home page sync). Keeping the version constants and the
// localStorage access in ONE place prevents two past bugs:
//  - components posting stale hardcoded versions ("1.0") that fought the
//    current-version re-consent check, and
//  - raw `localStorage` access crashing the whole app when storage is blocked
//    (Chrome "Block all cookies", private mode, embedded webviews).

export const LEGAL_CONSENT_KEY = "reallearn-legal-consent";
export const COOKIE_CONSENT_KEY = "reallearn-cookie-consent";
export const CURRENT_PRIVACY_VERSION = "2.0";
export const CURRENT_TERMS_VERSION = "2.0";
/** Bumping this re-prompts everyone for cookie/analytics consent. */
export const CURRENT_COOKIE_VERSION = "2.0";

/** Events used to coordinate the consent UI, GA loader and settings page. */
export const COOKIE_CONSENT_ACCEPTED_EVENT = "cookie-consent-accepted";
export const COOKIE_CONSENT_REVOKED_EVENT = "cookie-consent-revoked";
export const COOKIE_SETTINGS_OPEN_EVENT = "cookie-settings-open";

export interface CookieConsentState {
  accepted: boolean;
  timestamp: string;
  /** Cookie-policy version the choice was made against. */
  cookieVersion?: string;
}

export interface CookieConsentStatus {
  accepted: boolean;
  cookieVersion?: string | null;
}

/**
 * For signed-in users the server-side cookie-consent record is the source of
 * truth (it survives device changes / localStorage wipes / re-login). This is
 * the "new query to db" the cookie banner and analytics gate use INSTEAD of
 * relying solely on localStorage. Returns null when the request fails or the
 * user is anonymous (no server record possible), so callers fall back to
 * localStorage.
 */
export async function fetchCookieConsentStatus(
  getToken: () => Promise<string | null>
): Promise<CookieConsentStatus | null> {
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

    const response = await fetch(`${backendUrl}/api/agreement/status`, {
      method: "GET",
      headers,
    });
    if (!response.ok) return null;

    const data = await response.json();
    return {
      accepted: Boolean(data.accepted),
      cookieVersion: data.cookieVersion ?? null,
    };
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieConsentState | null {
  const stored = safeGetItem(COOKIE_CONSENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as CookieConsentState;
  } catch {
    return null;
  }
}

export function writeCookieConsent(accepted: boolean): CookieConsentState {
  const state: CookieConsentState = {
    accepted,
    timestamp: new Date().toISOString(),
    cookieVersion: CURRENT_COOKIE_VERSION,
  };
  safeSetItem(COOKIE_CONSENT_KEY, JSON.stringify(state));
  return state;
}

/** True only when the user accepted under the CURRENT cookie-policy version. */
export function hasAnalyticsConsent(): boolean {
  const state = readCookieConsent();
  return Boolean(state?.accepted && state.cookieVersion === CURRENT_COOKIE_VERSION);
}

export interface LegalConsentState {
  accepted: boolean;
  timestamp: string;
  privacyVersion?: string;
  termsVersion?: string;
  /** Clerk user id this record has been synced to the backend for. */
  syncedClerkId?: string;
}

export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors (private mode, blocked cookies)
  }
}

export function readLegalConsent(): LegalConsentState | null {
  const stored = safeGetItem(LEGAL_CONSENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as LegalConsentState;
  } catch {
    return null;
  }
}

export function writeLegalConsent(state: LegalConsentState): void {
  safeSetItem(LEGAL_CONSENT_KEY, JSON.stringify(state));
}

export function isConsentCurrent(state: LegalConsentState | null): boolean {
  return Boolean(
    state?.accepted &&
      state.privacyVersion === CURRENT_PRIVACY_VERSION &&
      state.termsVersion === CURRENT_TERMS_VERSION
  );
}
