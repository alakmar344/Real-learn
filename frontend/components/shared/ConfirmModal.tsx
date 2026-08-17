"use client";

import { useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  // Move focus INTO the dialog on open — otherwise focus stays on the
  // (now-hidden) trigger button behind the scrim, keyboard Enter re-clicks
  // it, and Tab walks the background page instead of Cancel/Confirm.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Consume the event so AppShell's window-level Escape handler doesn't
        // also close the sidebar underneath this modal.
        e.stopPropagation();
        onClose();
      }
      // Enter only confirms when focus is NOT on a button/link — otherwise a
      // user pressing Enter on "Cancel" would fire BOTH the cancel click and
      // this confirm shortcut (destructive action despite choosing cancel).
      if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        if (target && ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
          return;
        }
        // Only handle Enter when focus is inside the modal
        const dialog = trapRef.current;
        if (!dialog || !dialog.contains(target)) return;
        e.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, onConfirm, trapRef]);

  if (!open) return null;

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby="confirm-modal-description"
      onClick={onClose}
      className="modal-scrim"
    >
      <div
        className="modal-glass-surface confirm-modal animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="confirm-modal__title">{title}</h3>
        <p id="confirm-modal-description" className="confirm-modal__message">
          {message}
        </p>
        <div className="confirm-modal__actions">
          <button type="button" ref={cancelRef} onClick={onClose} className="btn-ghost">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={destructive ? "btn-ghost confirm-modal__danger" : "btn-primary"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
