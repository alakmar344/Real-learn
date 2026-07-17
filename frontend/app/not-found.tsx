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
          maxWidth: 440,
          textAlign: "center",
          padding: "var(--space-2xl) var(--space-xl)",
        }}
      >
        <p
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontSize: 72,
            fontWeight: 800,
            margin: 0,
            lineHeight: 1,
            color: "var(--accent)",
          }}
        >
          404
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontSize: 24,
            fontWeight: 700,
            margin: "var(--space-md) 0 var(--space-sm)",
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "none",
            borderRadius: "var(--radius-md)",
            background: "var(--accent)",
            color: "var(--on-accent)",
            padding: "12px 28px",
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            minHeight: 44,
            transition: "background var(--dur-fast) var(--ease-color)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>←</span>
          Go to RealLearn
        </Link>
      </div>
    </main>
  );
}
