"use client";
export default function UnlockAnimation({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="animate-gold-flash"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 80,
      }}
    />
  );
}
