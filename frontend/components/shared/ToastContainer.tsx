"use client";

import { useState, useEffect, useRef } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

export function showToast(message: string, type: Toast["type"] = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("reallearn:toast", { detail: { message, type } })
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { message, type } = e.detail;
      toastIdRef.current += 1;
      setToasts((prev) => [
        ...prev,
        { id: toastIdRef.current, message, type },
      ]);
    };
    window.addEventListener("reallearn:toast", handler as EventListener);
    return () => {
      window.removeEventListener("reallearn:toast", handler as EventListener);
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

  // A11y: the aria-live wrapper must stay permanently mounted — unmounting it
  // when the queue empties means screen readers never announce the first toast
  // after idle (live regions only announce changes to an EXISTING region).
  // Only the toast items themselves come and go.
  const accentFor = (type: Toast["type"]) =>
    type === "success"
      ? "var(--success)"
      : type === "error"
        ? "var(--danger)"
        : "var(--accent)";

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
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
          // Errors interrupt (assertive); success/info wait their turn.
          role={toast.type === "error" ? "alert" : "status"}
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
