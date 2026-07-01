"use client";

import { useEffect, useState } from "react";
import { Theme } from "@/types";
import { usePreferenceStore } from "@/store/preferenceStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const OPTIONS: { value: Theme; label: string; hint: string; swatch: string }[] = [
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

export default function ThemeModal({ open, onClose }: Props) {
  const theme = usePreferenceStore((s) => s.theme);
  const setTheme = usePreferenceStore((s) => s.setTheme);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a theme"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>Appearance</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>
          Pick the look that suits you. Your choice is saved on this device.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {OPTIONS.map((opt) => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  textAlign: "left",
                  padding: "12px 14px",
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
                    width: 32,
                    height: 32,
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
                  <span aria-hidden="true" style={{ color: "var(--accent)", fontSize: 18 }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
