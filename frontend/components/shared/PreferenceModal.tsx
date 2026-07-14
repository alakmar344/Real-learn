"use client";

import { useCallback, useEffect, useState } from "react";
import { Language, Level } from "@/types";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { THEME_OPTIONS } from "@/lib/themes";

const THEMES = THEME_OPTIONS;

const LANGUAGES: Language[] = [
  "English",
  "Hindi",
  "Gujarati",
  "Tamil",
  "Bengali",
  "Marathi",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Urdu",
  "Odia",
];

const LEVELS: Level[] = ["Class 6-8", "Class 9-10", "College / Advanced"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PreferenceModal({ open, onClose }: Props) {
  const theme = usePreferenceStore((s) => s.theme);
  const language = usePreferenceStore((s) => s.language);
  const level = usePreferenceStore((s) => s.level);
  const setTheme = usePreferenceStore((s) => s.setTheme);
  const setLanguage = usePreferenceStore((s) => s.setLanguage);
  const setLevel = usePreferenceStore((s) => s.setLevel);

  const [saving, setSaving] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  const handleSave = useCallback(() => {
    setSaving(true);
    try {
      localStorage.setItem("reallearn-preferences-onboarding", "true");
    } catch {
      // ignore
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Consume the event so AppShell's window-level Escape handler doesn't
        // also close the sidebar underneath this modal.
        e.stopPropagation();
        onClose();
      }
      // Enter only saves when focus is NOT on an interactive element —
      // otherwise pressing Enter on "Skip" fired BOTH the skip click and this
      // save shortcut, and committing a <select> choice closed the modal.
      if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        ) {
          return;
        }
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, handleSave]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose your preferences"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "var(--scrim, rgba(0,0,0,0.6))",
        backdropFilter: "blur(var(--blur-sm, 4px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          padding: "32px 28px",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-playfair)",
            fontWeight: 800,
            fontSize: 22,
            marginBottom: 4,
            color: "var(--text-primary)",
          }}
        >
          Set your preferences
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
          Personalize your learning experience. You can change these anytime in Settings.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
              htmlFor="pref-language"
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
            <select
              id="pref-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              style={{
                width: "100%",
                appearance: "none",
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                borderRadius: "var(--radius-md)",
                padding: "10px 32px 10px 12px",
                fontSize: 14,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pref-level"
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
            <select
              id="pref-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              style={{
                width: "100%",
                appearance: "none",
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                borderRadius: "var(--radius-md)",
                padding: "10px 32px 10px 12px",
                fontSize: 14,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 28 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "10px 18px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              minHeight: 44,
              opacity: saving ? 0.6 : 1,
            }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              border: "none",
              borderRadius: "var(--radius-md)",
              background: "var(--accent)",
              color: "var(--on-accent)",
              padding: "10px 18px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 700,
              minHeight: 44,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
