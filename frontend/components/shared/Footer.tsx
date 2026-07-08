"use client";

const linkStyle: React.CSSProperties = {
  color: "inherit",
  padding: "6px 4px",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
};

const Footer = () => (
  <footer
    style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: "12px 24px",
      textAlign: "center",
      fontSize: 11,
      color: "var(--text-tertiary)",
      lineHeight: 1.6,
    }}
  >
    <p style={{ margin: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <img src="/logo.svg" alt="RealLearn" style={{ height: 16 }} />
      {/* suppressHydrationWarning: statically prerendered HTML cached across
          a year boundary would otherwise hydration-error on the year. */}
      <span suppressHydrationWarning>© {new Date().getFullYear()} alakmar344</span>
      <span aria-hidden="true">·</span>
      <span>AI-generated — not reviewed by humans</span>
      <span aria-hidden="true">·</span>
      <span>Verify important info with professionals</span>
    </p>
    <p style={{ margin: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
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
