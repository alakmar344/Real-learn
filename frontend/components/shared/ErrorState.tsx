"use client";

interface Props {
  message: string;
  onRetry?: () => void;
  onHome?: () => void;
}

export default function ErrorState({ message, onRetry, onHome }: Props) {
  return (
    <main
      role="alert"
      style={{
        minHeight: "100vh",
        color: "var(--text-primary)",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-lg)",
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          maxWidth: 480,
          textAlign: "center",
          padding: "var(--space-2xl) var(--space-xl)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border-default)",
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative accent */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 60,
            height: 3,
            borderRadius: "var(--radius-xl)",
            background: "var(--accent)",
          }}
        />

        {/* Icon */}
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--accent-dim)",
            border: "2px solid var(--border-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto var(--space-lg)",
            fontSize: 24,
          }}
        >
          ⚠️
        </div>

        <h2
          style={{
            margin: "0 0 var(--space-sm)",
            fontSize: 28,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
          }}
        >
          Let&apos;s try that once more
        </h2>
        <p
          style={{
            margin: "0 0 var(--space-lg)",
            color: "var(--text-secondary)",
            fontSize: 15,
            lineHeight: 1.7,
            fontFamily: "var(--font-lora)",
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", gap: varSpaceSm, justifyContent: "center", flexWrap: "wrap" }}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="interactive-press"
              style={{
                border: "none",
                borderRadius: "var(--radius-md)",
                background: "var(--accent)",
                color: "var(--on-accent)",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                minHeight: 48,
                boxShadow: "var(--shadow-glow-accent)",
                transition: "all 300ms var(--ease-spring)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
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
              <span aria-hidden="true" style={{ fontSize: 16 }}>↻</span>
              Try Again
            </button>
          )}
          {onHome && (
            <button
              type="button"
              onClick={onHome}
              className="interactive-focus"
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--text-secondary)",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 48,
                transition: "all 300ms var(--ease-spring)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-accent)";
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.transform = "scale(1.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              ← Go Home
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

const varSpaceSm = "var(--space-sm)";
const _varSpaceLg = "var(--space-lg)";

