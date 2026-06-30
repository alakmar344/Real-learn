"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, onConfirm]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
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
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              padding: "10px 18px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              minHeight: 44,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              border: destructive
                ? "1px solid var(--wrong)"
                : "1px solid var(--accent)",
              borderRadius: "var(--radius-md)",
              background: destructive ? "var(--wrong-bg)" : "var(--accent)",
              color: destructive ? "var(--wrong)" : "#faf7f2",
              padding: "10px 18px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              minHeight: 44,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
