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
        padding: varSpaceLg,
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          maxWidth: 460,
          textAlign: "center",
          padding: varSpaceXl,
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border-default)",
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "block",
            width: 40,
            height: 2,
            margin: "0 auto var(--space-lg)",
            borderRadius: 2,
            background: "var(--accent)",
          }}
        />
        <h2
          style={{
            margin: "0 0 var(--space-sm)",
            fontSize: 26,
            fontWeight: 700,
            fontStyle: "italic",
            fontFamily: "var(--font-playfair)",
            lineHeight: 1.3,
          }}
        >
          Let&apos;s try that once more
        </h2>
        <p
          style={{
            margin: 0,
            color: "var(--text-secondary)",
            fontSize: 15,
            lineHeight: 1.7,
            fontFamily: "var(--font-lora)",
          }}
        >
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
                background: "var(--accent)",
                color: "var(--on-accent)",
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
const varSpaceLg = "var(--space-lg)";
const varSpaceXl = "var(--space-xl)";
