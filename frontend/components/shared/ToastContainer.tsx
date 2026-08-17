"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@/components/shared/icons";

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

// Errors stay long enough to actually read; routine confirmations clear fast.
const ERROR_DURATION_MS = 8000;
const DEFAULT_DURATION_MS = 4000;
const EXIT_MS = 200;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false);
  const duration = toast.type === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS;
  const remainingRef = useRef(duration);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const leavingRef = useRef(false);

  const beginExit = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
  }, []);

  const pause = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingRef.current -= Date.now() - startedAtRef.current;
  }, []);

  const resume = useCallback(() => {
    if (leavingRef.current || timerRef.current !== null) return;
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(beginExit, Math.max(remainingRef.current, 500));
  }, [beginExit]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(beginExit, remainingRef.current);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [beginExit]);

  // Let the exit transition play, then remove for real.
  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => onDismiss(toast.id), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving, onDismiss, toast.id]);

  return (
    <div
      // Errors interrupt (assertive); success/info wait their turn.
      role={toast.type === "error" ? "alert" : "status"}
      className={`toast toast--${toast.type}${leaving ? " is-leaving" : ""}`}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <span className="toast__message">{toast.message}</span>
      <button
        type="button"
        className="toast__dismiss"
        aria-label="Dismiss notification"
        onClick={beginExit}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
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

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // A11y: the aria-live wrapper must stay permanently mounted — unmounting it
  // when the queue empties means screen readers never announce the first toast
  // after idle (live regions only announce changes to an EXISTING region).
  // Only the toast items themselves come and go.
  return (
    <div aria-live="polite" className="toast-stack">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
