"use client";

export default function UnlockAnimation({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="animate-accent-flash"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 80,
      }}
    />
  );
}
