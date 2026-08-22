import { useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Icon } from "@/components/shared/icons";
import { useTranslation } from "@/hooks/useTranslation";
import { TranslationKey } from "@/lib/i18n";

interface ShortcutItem {
  keys: string[];
  keyTranslation: TranslationKey;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["Ctrl", "Enter"], keyTranslation: "shortcuts.submit" },
  { keys: ["?"], keyTranslation: "shortcuts.toggle" },
  { keys: ["Esc"], keyTranslation: "shortcuts.close" },
  { keys: ["1-9"], keyTranslation: "shortcuts.selectOption" },
  { keys: ["→"], keyTranslation: "shortcuts.nextQuestion" },
];

export default function KeyboardShortcuts() {
  const { t } = useTranslation();
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
      aria-label={t("shortcuts.title")}
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
          <h3 className="shortcuts-modal__title">{t("shortcuts.title")}</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
            className="btn-icon shortcuts-modal__close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="shortcuts-modal__list">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="shortcut-row">
              <span className="shortcut-row__action">{t(shortcut.keyTranslation)}</span>
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
          {t("shortcuts.hint")}
        </p>
      </div>
    </div>
  );
}
