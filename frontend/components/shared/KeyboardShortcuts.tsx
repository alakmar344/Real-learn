"use client";

import { useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Icon } from "@/components/shared/icons";

/**
 * Keyboard shortcuts overlay — press "?" to show all available shortcuts.
 * Power users love this; discoverability is otherwise zero.
 */

const SHORTCUTS = [
  { keys: ["Ctrl", "Enter"], action: "Submit question / Start lesson" },
  { keys: ["?"], action: "Show keyboard shortcuts" },
  { keys: ["Esc"], action: "Close modal / quiz / sidebar" },
  { keys: ["1-9"], action: "Select quiz answer (when quiz is open)" },
  { keys: ["→"], action: "Next quiz question (after answering)" },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  // A11y (WCAG 2.4.3): real focus trap — keeps Tab inside the dialog and
  // restores focus on close, consistent with every other dialog in the app.
  const dialogRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;

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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={() => setOpen(false)}
      className="modal-scrim animate-overlay-fade"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="modal-glass-surface shortcuts-modal animate-fade-up"
      >
        <div className="shortcuts-modal__head">
          <h3 className="shortcuts-modal__title">Keyboard Shortcuts</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="btn-icon shortcuts-modal__close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="shortcuts-modal__list">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="shortcut-row">
              <span className="shortcut-row__action">{shortcut.action}</span>
              <div className="shortcut-row__keys">
                {shortcut.keys.map((key, j) => (
                  <kbd key={j} className="kbd">
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="shortcuts-modal__hint">
          Press <kbd className="kbd kbd--inline">?</kbd> to toggle this overlay
        </p>
      </div>
    </div>
  );
}
