"use client";

import { useState, useEffect } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;
let setToastsGlobal: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export function showToast(message: string, type: Toast["type"] = "info") {
  if (!setToastsGlobal) return;
  setToastsGlobal((prev) => [...prev, { id: ++toastId, message, type }]);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  setToastsGlobal = setToasts;

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  const accent =
    toasts[0].type === "success"
      ? "var(--correct)"
      : toasts[0].type === "error"
        ? "var(--wrong)"
        : "var(--accent)";

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            border: `1px solid ${accent}`,
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            fontSize: 13,
            boxShadow: "var(--shadow-md)",
            maxWidth: 340,
            lineHeight: 1.4,
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
