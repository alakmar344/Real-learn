"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { Theme, Language, Level } from "@/types";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { showToast } from "@/components/shared/ToastContainer";
import { usePreferenceStore } from "@/store/preferenceStore";
import LanguageSelector from "@/components/shared/LanguageSelector";
import LevelSelector from "@/components/shared/LevelSelector";

const THEMES: { value: Theme; label: string; hint: string; swatch: string }[] = [
  {
    value: "light",
    label: "Paper",
    hint: "Warm cream — the classic textbook look",
    swatch: "#f5f0e8",
  },
  {
    value: "dark",
    label: "Night",
    hint: "Easy on the eyes for late-night study",
    swatch: "#14110c",
  },
];

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com"
).replace(/\/$/, "");

export default function SettingsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();

  const theme = usePreferenceStore((s) => s.theme);
  const language = usePreferenceStore((s) => s.language);
  const level = usePreferenceStore((s) => s.level);
  const setTheme = usePreferenceStore((s) => s.setTheme);
  const setLanguage = usePreferenceStore((s) => s.setLanguage);
  const setLevel = usePreferenceStore((s) => s.setLevel);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("reallearn-preferences-onboarding", "true");
    } catch {
      // ignore
    }
  }, []);

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
        localStorage.clear();
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

        localData.theme = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-theme") || "null");
          } catch {
            return null;
          }
        })();

        localData.lessonState = (() => {
          try {
            return JSON.parse(localStorage.getItem("reallearn-lesson-store") || "null");
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

  if (!isLoaded) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
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
    router.push("/sign-in?redirect_url=/settings");
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
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

        <h1
          style={{
            fontFamily: "var(--font-playfair)",
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
                          background: opt.swatch,
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
          </div>
        </section>

        {/* Account Section */}
        <section
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

        {/* Data Section */}
        <section
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
