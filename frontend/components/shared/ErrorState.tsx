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
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        display: "grid",
        placeItems: "center",
        padding: varSpaceLg,
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          maxWidth: 480,
          textAlign: "center",
          padding: varSpaceXl,
          borderRadius: "var(--radius-xl)",
          border: "1px solid rgba(239,68,68,0.25)",
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 48, display: "block", marginBottom: varSpaceMd }}>⚠️</span>
        <h2 style={{ margin: "0 0 var(--space-sm)", fontSize: 22, fontWeight: 600 }}>
          Something went wrong
        </h2>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ marginTop: varSpaceLg, display: "flex", gap: varSpaceSm, justifyContent: "center", flexWrap: "wrap" }}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                border: "none",
                borderRadius: "var(--radius-md)",
                background: "var(--gold-primary)",
                color: "var(--bg-primary)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Try Again
            </button>
          )}
          {onHome && (
            <button
              type="button"
              onClick={onHome}
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "var(--text-secondary)",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Go Home
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

const varSpaceSm = "var(--space-sm)";
const varSpaceMd = "var(--space-md)";
const varSpaceLg = "var(--space-lg)";
const varSpaceXl = "var(--space-xl)";
