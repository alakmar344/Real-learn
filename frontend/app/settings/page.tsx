"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { LessonMode } from "@/types";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { showToast } from "@/components/shared/ToastContainer";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useLessonStore } from "@/store/lessonStore";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { cancelPendingDebouncedWrites } from "@/lib/debouncedStorage";
import { clearArchivedLessons } from "@/lib/lessonArchive";
import { useMounted } from "@/hooks/useMounted";
import { Icon } from "@/components/shared/icons";
import { Skeleton, SkeletonCard } from "@/components/shared/Skeleton";
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_CONSENT_REVOKED_EVENT,
  COOKIE_SETTINGS_OPEN_EVENT,
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  fetchCookieConsentStatus,
  readCookieConsent,
} from "@/lib/legalConsent";
import LanguageSelector from "@/components/shared/LanguageSelector";
import LevelSelector from "@/components/shared/LevelSelector";
import { THEME_OPTIONS } from "@/lib/themes";
import { PERF_MODE_OPTIONS } from "@/lib/performance";
import {
  MAX_PERSONALIZATION_NOTES_CHARS,
  PERSONALIZATION_CHECKLIST_OPTIONS,
  sanitizeChecklist,
  sanitizeNotes,
} from "@/lib/personalization";

const THEMES = THEME_OPTIONS;

const MODES: { value: LessonMode; label: string; hint: string }[] = [
  {
    value: "fast",
    label: "Fast",
    hint: "One instant, direct answer — quick like a chat reply",
  },
  {
    value: "explain",
    label: "Explain",
    hint: "Deep 3-part journey with quizzes and real-world context",
  },
];

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com"
).replace(/\/$/, "");

// Journey-rail-style check node; visibility handled in CSS via --active.
function CheckNode() {
  return (
    <span className="option-row__check" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 6.5L5 9l4.5-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  // The preference store is persisted: rendering persisted theme/mode on the
  // first client render mismatches the SSR HTML (which has the defaults) and
  // triggers a React hydration error. Gate on mount, like the learn page.
  const mounted = useMounted();

  const theme = usePreferenceStore((s) => s.theme);
  const language = usePreferenceStore((s) => s.language);
  const level = usePreferenceStore((s) => s.level);
  const mode = usePreferenceStore((s) => s.mode);
  const perfMode = usePreferenceStore((s) => s.perfMode);
  const setTheme = usePreferenceStore((s) => s.setTheme);
  const setLanguage = usePreferenceStore((s) => s.setLanguage);
  const setLevel = usePreferenceStore((s) => s.setLevel);
  const setMode = usePreferenceStore((s) => s.setMode);
  const setPerfMode = usePreferenceStore((s) => s.setPerfMode);
  const personalization = usePreferenceStore((s) => s.personalization);
  const setPersonalization = usePreferenceStore((s) => s.setPersonalization);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cookieChoiceLabel, setCookieChoiceLabel] = useState("Not set");
  const lastHiddenRef = useRef<number>(0);

  // Reflect the current cookie/analytics choice, live — including when it is
  // changed via the banner this page can re-open. For signed-in users the
  // server-side DB record is the source of truth (it survives a localStorage
  // wipe / re-login), so we query it first and fall back to localStorage.
  useEffect(() => {
    const refresh = async () => {
      if (isSignedIn) {
        const db = await fetchCookieConsentStatus(getToken);
        if (db) {
          setCookieChoiceLabel(
            db.accepted ? "Analytics allowed" : "Analytics off"
          );
          return;
        }
      }
      const consent = readCookieConsent();
      setCookieChoiceLabel(
        consent == null ? "Not set" : consent.accepted ? "Analytics allowed" : "Analytics off"
      );
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") lastHiddenRef.current = Date.now();
    };
    const onFocus = () => {
      if (Date.now() - lastHiddenRef.current > 30000) refresh();
    };
    refresh();
    window.addEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, refresh);
    window.addEventListener(COOKIE_CONSENT_REVOKED_EVENT, refresh);
    // The banner also saves "decline" without a revoke event when there was no
    // prior acceptance; poll cheaply on focus to stay accurate.
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, refresh);
      window.removeEventListener(COOKIE_CONSENT_REVOKED_EVENT, refresh);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isSignedIn, getToken]);

  useEffect(() => {
    try {
      localStorage.setItem("reallearn-preferences-onboarding", "true");
    } catch {
      // ignore
    }
  }, []);

  // Navigation is a side effect — calling router.push during render is
  // illegal (React "Cannot update Router while rendering" error) and can
  // fire multiple times across re-renders.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in?redirect_url=/settings");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleDeleteData = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND_URL}/api/account`, {
        method: "DELETE",
        headers,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete account");
      }

      try {
        // Clear the in-memory stores FIRST (this navigation is client-side —
        // no reload — so stale in-memory state could otherwise re-persist),
        // then drop any debounced write that was scheduled before deletion,
        // then remove the persisted keys.
        try {
          useLessonStore.getState().resetAll();
          useProgressStore.getState().resetEngagement();
          useSavedJourneysStore.setState({ journeys: [] });
        } catch { /* ignore */ }
        cancelPendingDebouncedWrites();
        try {
          const allKeys = Object.keys(localStorage);
          for (const key of allKeys) {
            if (key.startsWith("reallearn-") || key.startsWith("reallearn_")) {
              localStorage.removeItem(key);
            }
          }
        } catch { /* ignore */ }
        // Also wipe the IndexedDB lesson archive (full bodies of older
        // journeys live there, not in localStorage).
        await clearArchivedLessons().catch(() => { /* best-effort */ });
      } catch {
        // ignore storage errors
      }

      await signOut();
      showToast("Account deleted successfully", "success");
      router.push("/");
    } catch (err) {
      console.error("[frontend][Settings] delete data failed", err);
      showToast(
        err instanceof Error
          ? `Could not delete your data: ${err.message}`
          : "Could not delete your data. Please try again.",
        "error"
      );
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com";
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let backendData = null;
      try {
        const res = await fetch(`${backendUrl}/api/export-data`, {
          method: "GET",
          headers,
        });
        if (res.ok) {
          backendData = await res.json();
        }
      } catch {
        // backend export may fail if not authenticated
      }

      const localData: Record<string, unknown> = {};
      try {
        const savedJourneysKey = "reallearn-saved-journeys";
        const savedJourneys = localStorage.getItem(savedJourneysKey);
        if (savedJourneys) {
          localData.savedJourneys = JSON.parse(savedJourneys);
        }

        localData.cookieConsent = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-cookie-consent") || "null");
          } catch {
            return null;
          }
        })();

        localData.legalConsent = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-legal-consent") || "null");
          } catch {
            return null;
          }
        })();

        // Current preferences live under "reallearn-preferences" (the old
        // "reallearn-theme" key is legacy); the lesson store persists under
        // "reallearn-journey". Exporting the wrong keys silently omitted
        // both from this privacy/GDPR export.
        localData.preferences = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-preferences") || "null");
          } catch {
            return null;
          }
        })();

        localData.legacyTheme = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-theme") || "null");
          } catch {
            return null;
          }
        })();

        localData.lessonState = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-journey") || "null");
          } catch {
            return null;
          }
        })();

        localData.progress = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-progress") || "null");
          } catch {
            return null;
          }
        })();

        localData.feedback = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-feedback") || "null");
          } catch {
            return null;
          }
        })();

        localData.personalizationSkipped = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-personalization-skipped") || "null");
          } catch {
            return null;
          }
        })();
      } catch {
        // ignore local storage errors
      }

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        backend: backendData,
        local: localData,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reallearn-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Data exported successfully", "success");
    } catch (err) {
      console.error("[frontend][Settings] export data failed", err);
      showToast(
        err instanceof Error
          ? `Could not export data: ${err.message}`
          : "Could not export data. Please try again.",
        "error"
      );
    }
  };

  if (!isLoaded || !mounted) {
    return (
      <main className="flow-page" aria-label="Loading settings...">
        <div className="flow-page__inner flow-page__inner--narrow flow-stack">
          <Skeleton height={32} width="40%" borderRadius="6px" />
          <SkeletonCard height={140} />
          <SkeletonCard height={180} />
          <SkeletonCard height={160} />
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    // The redirect is handled by the effect above.
    return null;
  }

  return (
    <main className="flow-page">
      <div className="flow-page__inner flow-page__inner--narrow">
        <button type="button" onClick={() => router.back()} className="settings-back">
          <span className="settings-back__arrow" aria-hidden="true">
            <Icon name="arrow-left" size={14} />
          </span>{" "}
          Back
        </button>

        <header className="page-hero">
          <Icon
            name="settings"
            size={110}
            strokeWidth={0.75}
            className="page-hero__glyph page-hero__glyph--icon"
          />
          <span className="section-overline">Make It Yours</span>
          <h1 className="page-hero__title">Settings</h1>
          <p className="page-hero__sub">Manage your account, data, and preferences.</p>
        </header>

        {/* Preferences Section */}
        <section className="settings-panel-glass">
          <h2 className="settings-title">Preferences</h2>
          <p className="settings-sub">
            Appearance, language, and learning level are saved on this device.
          </p>

          <div className="settings-group">
            <div>
              <h3 id="theme-heading" className="flow-label">
                Theme
              </h3>
              <div role="group" aria-labelledby="theme-heading" className="option-stack">
                {THEMES.map((opt) => {
                  const active = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={`option-row${active ? " option-row--active" : ""}`}
                      aria-pressed={active}
                    >
                      <span
                        aria-hidden="true"
                        className="option-row__swatch"
                        style={{ background: opt.swatch, border: `3px solid ${opt.accent}` }}
                      />
                      <span className="option-row__body">
                        <span className="option-row__title">{opt.label}</span>
                        <span className="option-row__hint">{opt.hint}</span>
                      </span>
                      <CheckNode />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 id="answer-mode-heading" className="flow-label">
                Answer mode
              </h3>
              <div role="group" aria-labelledby="answer-mode-heading" className="option-stack">
                {MODES.map((opt) => {
                  const active = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      className={`option-row${active ? " option-row--active" : ""}`}
                      aria-pressed={active}
                    >
                      <span className="option-row__body">
                        <span className="option-row__title">{opt.label}</span>
                        <span className="option-row__hint">{opt.hint}</span>
                      </span>
                      <CheckNode />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="flow-label" htmlFor="settings-language">
                Language
              </label>
              <LanguageSelector id="settings-language" value={language} onChange={setLanguage} />
            </div>

            <div>
              <label className="flow-label" htmlFor="settings-level">
                Learning level
              </label>
              <LevelSelector id="settings-level" value={level} onChange={setLevel} />
            </div>

            <div>
              <h3 id="perf-mode-heading" className="flow-label">
                Visual performance
              </h3>
              <div role="group" aria-labelledby="perf-mode-heading" className="option-stack">
                {PERF_MODE_OPTIONS.map((opt) => {
                  const active = perfMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPerfMode(opt.value)}
                      className={`option-row${active ? " option-row--active" : ""}`}
                      aria-pressed={active}
                    >
                      <span className="option-row__body">
                        <span className="option-row__title">{opt.label}</span>
                        <span className="option-row__hint">{opt.description}</span>
                      </span>
                      <CheckNode />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Learning Preferences Section */}
        <section className="settings-panel-glass">
          <h2 className="settings-title">Learning preferences</h2>
          <p className="settings-sub">
            Optional: tell us how you learn best. This is stored on this device and sent with each
            lesson request so explanations can be tailored to you.
          </p>

          <fieldset className="fieldset-reset">
            <legend className="flow-label">Select any that apply</legend>
            <div className="option-stack">
              {PERSONALIZATION_CHECKLIST_OPTIONS.map((option) => {
                const active = personalization.checklist.includes(option);
                return (
                  <label
                    key={option}
                    className={`option-row${active ? " option-row--active" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => {
                        const next = active
                          ? personalization.checklist.filter((item) => item !== option)
                          : [...personalization.checklist, option];
                        setPersonalization({
                          ...personalization,
                          checklist: sanitizeChecklist(next),
                        });
                      }}
                    />
                    <span className="option-row__body">{option}</span>
                    <CheckNode />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="settings-personalization-notes" className="flow-label">
              Anything else you&apos;d like us to know?
            </label>
            <textarea
              id="settings-personalization-notes"
              className="glass-textarea"
              value={personalization.notes}
              onChange={(e) =>
                setPersonalization({
                  ...personalization,
                  notes: sanitizeNotes(e.target.value),
                })
              }
              placeholder="For example: I understand concepts better with pictures..."
              rows={4}
            />
            <p className="char-count">
              {personalization.notes.length}/{MAX_PERSONALIZATION_NOTES_CHARS}
            </p>
          </div>
        </section>

        {/* Account Section */}
        <section className="settings-panel-glass">
          <h2 className="settings-title">Account</h2>
          <div className="account-row">
            <UserButton />
            <div>
              <p className="account-row__name">Your account</p>
              <p className="account-row__hint">
                Manage your profile, sign out, or delete your account via the menu above.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="settings-panel-glass">
          <h2 className="settings-title">Privacy</h2>
          <p className="settings-sub">
            Change your cookie and analytics choice anytime — withdrawing consent
            is as easy as giving it.
          </p>
          <button
            type="button"
            className="settings-action"
            onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_OPEN_EVENT))}
          >
            <span className="settings-action__label">
              <Icon name="cookie" size={18} />
              Cookie &amp; analytics preferences
            </span>
            <span className="settings-action__note">{cookieChoiceLabel}</span>
          </button>
        </section>

        {/* Data Section */}
        <section className="settings-panel-glass">
          <h2 className="settings-title">Data</h2>
          <p className="settings-sub">
            Export or permanently delete your data stored on RealLearn.
          </p>

          <div className="option-stack option-stack--loose">
            <button type="button" className="settings-action" onClick={handleExportData}>
              <span className="settings-action__label">
                <Icon name="download" size={18} />
                Export my data
              </span>
              <span className="settings-action__note">Download JSON</span>
            </button>

            <button
              type="button"
              className="settings-action settings-action--danger"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
            >
              <span className="settings-action__label">
                <Icon name="trash" size={18} />
                {deleting ? "Deleting…" : "Delete my data"}
              </span>
              <span className="settings-action__note">Permanent</span>
            </button>
          </div>
        </section>

        {/* Legal Section */}
        <section className="settings-panel-glass">
          <h2 className="settings-title">Legal</h2>
          <p className="settings-sub">
            Review our policies, exercise your privacy rights, or contact our grievance officer.
          </p>

          <div className="option-stack option-stack--loose">
            <a
              href="/legal?tab=privacy"
              className="settings-action"
              onClick={(e) => {
                e.preventDefault();
                router.push("/legal?tab=privacy");
              }}
            >
              <span className="settings-action__label">
                <Icon name="book-open" size={18} />
                Privacy Policy
              </span>
              <span className="settings-action__note">v{CURRENT_PRIVACY_VERSION}</span>
            </a>

            <a
              href="/legal?tab=terms"
              className="settings-action"
              onClick={(e) => {
                e.preventDefault();
                router.push("/legal?tab=terms");
              }}
            >
              <span className="settings-action__label">
                <Icon name="book-open" size={18} />
                Terms of Service
              </span>
              <span className="settings-action__note">v{CURRENT_TERMS_VERSION}</span>
            </a>

            <a
              href="mailto:esamzai365@gmail.com?subject=Parental%20consent%20%2F%20data%20request"
              className="settings-action"
            >
              <span className="settings-action__label">
                <Icon name="message-circle" size={18} />
                Parent/guardian request
              </span>
              <span className="settings-action__note">Email grievance officer</span>
            </a>
          </div>
        </section>
      </div>

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete everything?"
        message="This will permanently delete your account, erase your stored cookie-consent records, and clear all saved lessons on this device. This cannot be undone."
        confirmLabel="Delete everything"
        cancelLabel="Keep my data"
        destructive
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          handleDeleteData();
        }}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </main>
  );
}
