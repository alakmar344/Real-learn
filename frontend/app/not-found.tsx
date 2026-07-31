import Link from "next/link";
import Navbar from "@/components/shared/Navbar";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          padding: "var(--space-lg)",
        }}
      >
        <div
          className="glass-panel engraved identity-texture texture-noise animate-fade-up"
          style={{
            maxWidth: 460,
            width: "100%",
            textAlign: "center",
            padding: "clamp(32px, 6vw, 48px)",
            borderRadius: "var(--radius-2xl)",
          }}
        >
          <p
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontSize: 84,
              fontWeight: 800,
              margin: 0,
              lineHeight: 1,
              color: "var(--accent)",
              letterSpacing: "-0.04em",
            }}
          >
            404
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontSize: 26,
              fontWeight: 800,
              margin: "var(--space-md) 0 var(--space-xs)",
            }}
          >
            Page not found
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.6,
              margin: "0 0 var(--space-lg)",
              fontFamily: "var(--font-inter)",
            }}
          >
            The page you are looking for does not exist or may have been moved.
          </p>
          <Link
            href="/"
            className="btn-primary"
            style={{ textDecoration: "none" }}
          >
            <span aria-hidden="true" style={{ fontSize: 18 }}>←</span>
            Go to RealLearn
          </Link>
        </div>
      </div>
    </main>
  );
}
