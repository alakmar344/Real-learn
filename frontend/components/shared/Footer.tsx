"use client";

const linkStyle: React.CSSProperties = {
  color: "var(--accent)",
  padding: "6px 4px",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  fontWeight: 500,
};

const Footer = () => (
  <footer
    style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: "16px 24px",
      textAlign: "center",
      fontSize: 12,
      color: "var(--text-tertiary)",
      lineHeight: 1.7,
    }}
  >
    <p style={{ margin: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span
        style={{
          fontWeight: 800,
          background: "var(--accent-gradient)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        RealLearn
      </span>
      {/* suppressHydrationWarning: statically prerendered HTML cached across
          a year boundary would otherwise hydration-error on the year. */}
      <span suppressHydrationWarning>© {new Date().getFullYear()} alakmar344</span>
      <span aria-hidden="true">·</span>
      <span>AI-generated — verify with pros</span>
    </p>
    <p style={{ margin: "4px 0 0", display: "flex", justifyContent: "center", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <a href="/legal?tab=privacy" style={linkStyle}>Privacy</a>
      <span aria-hidden="true">·</span>
      <a href="/legal?tab=terms" style={linkStyle}>Terms</a>
      <span aria-hidden="true">·</span>
      <a href="/legal" style={linkStyle}>Legal</a>
      <span aria-hidden="true">·</span>
      <a href="mailto:esamzai365@gmail.com" style={linkStyle}>Support</a>
    </p>
  </footer>
);

export default Footer;
