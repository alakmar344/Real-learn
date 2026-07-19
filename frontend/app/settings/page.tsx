"use client";

import { useState, useEffect } from "react";
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
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_CONSENT_REVOKED_EVENT,
  COOKIE_SETTINGS_OPEN_EVENT,
  fetchCookieConsentStatus,
  readCookieConsent,
} from "@/lib/legalConsent";
import LanguageSelector from "@/components/shared/LanguageSelector";
import LevelSelector from "@/components/shared/LevelSelector";
import { THEME_OPTIONS } from "@/lib/themes";
import { PERF_MODE_OPTIONS } from "@/lib/performance";

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

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cookieChoiceLabel, setCookieChoiceLabel] = useState("Not set");

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
    refresh();
    window.addEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, refresh);
    window.addEventListener(COOKIE_CONSENT_REVOKED_EVENT, refresh);
    // The banner also saves "decline" without a revoke event when there was no
    // prior acceptance; poll cheaply on focus to stay accurate.
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, refresh);
      window.removeEventListener(COOKIE_CONSENT_REVOKED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
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
        const REALLEARN_KEYS = [
          "reallearn-preferences",
          "reallearn-journey",
          "reallearn-progress",
          "reallearn-saved-journeys",
          "reallearn-legal-consent",
          "reallearn-cookie-consent",
          "reallearn-theme",
          "reallearn-preferences-onboarding",
          "reallearn-feedback",
        ];
        REALLEARN_KEYS.forEach((k) => {
          try { localStorage.removeItem(k); } catch { /* ignore */ }
        });
        // Also wipe the IndexedDB lesson archive (full bodies of older
        // journeys live there, not in localStorage).
        await clearArchivedLessons().catch(() => { /* best-effort */ });
      } catch {
        // ignore storage errors
      }

      await signOut(() => {
        showToast("Account deleted successfully", "success");
        router.push("/");
      });
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
      <main
        style={{
          minHeight: "100vh",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </main>
    );
  }

  if (!isSignedIn) {
    // The redirect is handled by the effect above.
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "var(--text-primary)",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 14,
            padding: "4px 0",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 18 }}>←</span> Back
        </button>

        <span className="section-overline" style={{ marginBottom: 6 }}>
          設定 — Settings
        </span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 32,
            marginBottom: 8,
          }}
        >
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 14 }}>
          Manage your account, data, and preferences.
        </p>

        {/* Preferences Section */}
        <section
          className="settings-section"
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 24,
            background: "var(--bg-card)",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 4,
              color: "var(--text-primary)",
            }}
          >
            Preferences
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>
            Appearance, language, and learning level are saved on this device.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                Theme
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {THEMES.map((opt) => {
                  const active = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        border: active ? "2px solid var(--accent)" : "1px solid var(--border-default)",
                        background: active ? "var(--accent-dim)" : "var(--bg-surface)",
                        cursor: "pointer",
                        minHeight: 44,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${opt.swatch} 55%, ${opt.accent} 55%)`,
                          border: "1px solid var(--border-default)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                          {opt.label}
                        </span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>{opt.hint}</span>
                      </span>
                      {active && (
                        <span aria-hidden="true" style={{ color: "var(--accent)", fontSize: 16 }}>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                Answer mode
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MODES.map((opt) => {
                  const active = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        border: active ? "2px solid var(--accent)" : "1px solid var(--border-default)",
                        background: active ? "var(--accent-dim)" : "var(--bg-surface)",
                        cursor: "pointer",
                        minHeight: 44,
                      }}
                    >
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                          {opt.label}
                        </span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>{opt.hint}</span>
                      </span>
                      {active && (
                        <span aria-hidden="true" style={{ color: "var(--accent)", fontSize: 16 }}>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                Language
              </label>
              <LanguageSelector value={language} onChange={setLanguage} />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                Learning level
              </label>
              <LevelSelector value={level} onChange={setLevel} />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                Visual performance
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PERF_MODE_OPTIONS.map((opt) => {
                  const active = perfMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPerfMode(opt.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        border: active ? "2px solid var(--accent)" : "1px solid var(--border-default)",
                        background: active ? "var(--accent-dim)" : "var(--bg-surface)",
                        cursor: "pointer",
                        minHeight: 44,
                      }}
                    >
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                          {opt.label}
                        </span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>{opt.description}</span>
                      </span>
                      {active && (
                        <span aria-hidden="true" style={{ color: "var(--accent)", fontSize: 16 }}>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section
          className="settings-section"
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 24,
            background: "var(--bg-card)",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 16,
              color: "var(--text-primary)",
            }}
          >
            Account
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <UserButton />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                Your account
              </p>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
                Manage your profile, sign out, or delete your account via the menu above.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section
          className="settings-section"
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 24,
            background: "var(--bg-card)",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 8,
              color: "var(--text-primary)",
            }}
          >
            Privacy
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>
            Change your cookie and analytics choice anytime — withdrawing consent
            is as easy as giving it.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_OPEN_EVENT))}
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "12px 16px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              minHeight: 44,
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <span>Cookie &amp; analytics preferences</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {cookieChoiceLabel}
            </span>
          </button>
        </section>

        {/* Data Section */}
        <section
          className="settings-section"
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            background: "var(--bg-card)",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 8,
              color: "var(--text-primary)",
            }}
          >
            Data
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>
            Export or permanently delete your data stored on RealLearn.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              onClick={handleExportData}
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--text-secondary)",
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                minHeight: 44,
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Export my data</span>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Download JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
              style={{
                border: "1px solid var(--wrong)",
                borderRadius: "var(--radius-md)",
                background: "var(--wrong-bg)",
                color: "var(--wrong)",
                padding: "12px 16px",
                cursor: deleting ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
                minHeight: 44,
                opacity: deleting ? 0.6 : 1,
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{deleting ? "Deleting…" : "Delete my data"}</span>
              <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>Permanent</span>
            </button>
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
