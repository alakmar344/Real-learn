"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        color: "var(--text-primary)",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-lg)",
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          maxWidth: 460,
          textAlign: "center",
          padding: "var(--space-2xl) var(--space-xl)",
          position: "relative",
        }}
      >
        {/* Decorative background */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(300px, 70vw)",
            height: "min(300px, 70vw)",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontSize: "clamp(64px, 15vw, 96px)",
              fontWeight: 900,
              margin: 0,
              lineHeight: 1,
              color: "var(--accent)",
              background: "var(--accent-gradient)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            404
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontSize: "clamp(20px, 4vw, 26px)",
              fontWeight: 700,
              margin: "var(--space-md) 0 var(--space-sm)",
              letterSpacing: "-0.02em",
            }}
          >
            Page not found
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.7,
              margin: "0 0 var(--space-lg)",
              fontFamily: "var(--font-lora), Georgia, serif",
            }}
          >
            The page you are looking for does not exist or may have been moved.
          </p>
          <Link
            href="/"
            className="interactive-press"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "14px 28px",
              background: "var(--accent)",
              color: "var(--on-accent)",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
              minHeight: 50,
              boxShadow: "var(--shadow-glow-accent)",
              transition: "all 300ms var(--ease-spring)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--glass-edge)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "var(--shadow-glow-accent)";
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 18 }}>←</span>
            Go to RealLearn
          </Link>
        </div>
      </div>
    </main>
  );
}
