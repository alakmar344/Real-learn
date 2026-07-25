"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Keyboard shortcuts overlay — press "?" to show all available shortcuts.
 * Power users love this; discoverability is otherwise zero.
 */

const SHORTCUTS = [
  { keys: ["Ctrl", "Enter"], action: "Submit question / Start lesson" },
  { keys: ["?"], action: "Show keyboard shortcuts" },
  { keys: ["Esc"], action: "Close modal / quiz / sidebar" },
  { keys: ["1-4"], action: "Select quiz answer (when quiz is open)" },
  { keys: ["→"], action: "Next quiz question (after answering)" },
  { keys: ["⌘", "K"], action: "Focus search (on progress page)" },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    return () => {
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={() => setOpen(false)}
      className="animate-overlay-fade"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "var(--scrim, rgba(20,17,12,0.5))",
        backdropFilter: "blur(var(--blur-sm, 4px))",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-level-burst"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "24px 28px",
          maxWidth: 400,
          width: "100%",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            Keyboard Shortcuts
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              fontSize: 18,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SHORTCUTS.map((shortcut, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                {shortcut.action}
              </span>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 28,
                      height: 26,
                      padding: "0 6px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontFamily: "var(--font-mono, monospace)",
                      fontWeight: 600,
                      boxShadow: "0 1px 0 var(--border-default)",
                    }}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
          Press <kbd style={{ padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border-default)", fontSize: 11 }}>?</kbd> to toggle this overlay
        </p>
      </div>
    </div>
  );
}
