"use client";

export default function UnlockAnimation({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 80,
      }}
    >
      {/* Full-screen accent flash */}
      <div
        className="animate-accent-flash"
        style={{
          position: "absolute",
          inset: 0,
        }}
      />
      {/* Radial glow burst from the center */}
      <div
        className="animate-glow-burst"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 60%, var(--accent-glow) 0%, transparent 55%)",
          opacity: 0,
        }}
      />
    </div>
  );
}
