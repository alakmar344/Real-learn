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
      <div className="animate-fade-up not-found-canvas">
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
          Lost in Space?
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 15,
            lineHeight: 1.7,
            margin: "0 0 var(--space-lg)",
          }}
        >
          The page you are looking for does not exist or has been shifted in the cosmos.
        </p>
        <Link
          href="/"
          className="btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 28px",
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>←</span>
          Return to RealLearn
        </Link>
      </div>
    </main>
  );
}
