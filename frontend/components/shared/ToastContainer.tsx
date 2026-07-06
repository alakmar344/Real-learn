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

  // Bind the global setter in an effect (not as a render-phase side effect,
  // which breaks under StrictMode/concurrent re-renders) and unbind on
  // unmount so showToast()'s null-guard sees a dead container instead of
  // silently calling a stale setter.
  useEffect(() => {
    setToastsGlobal = setToasts;
    return () => {
      if (setToastsGlobal === setToasts) setToastsGlobal = null;
    };
  }, []);

  const headToastId = toasts[0]?.id;
  useEffect(() => {
    // Key the timer to the HEAD toast, not the whole array — depending on the
    // array restarted the 3.2s countdown every time a new toast arrived, so a
    // burst of toasts kept the oldest one on screen indefinitely.
    if (headToastId === undefined) return;
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [headToastId]);

  if (toasts.length === 0) return null;

  const accentFor = (type: Toast["type"]) =>
    type === "success"
      ? "var(--correct)"
      : type === "error"
        ? "var(--wrong)"
        : "var(--accent)";

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        // Above modal scrims (which sit at 200) so feedback stays visible.
        zIndex: 300,
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
            border: `1px solid ${accentFor(toast.type)}`,
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
