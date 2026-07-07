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
export const CURRENT_PRIVACY_VERSION = "1.4";
export const CURRENT_TERMS_VERSION = "1.4";

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
