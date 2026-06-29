"use client";

const Footer = () => (
  <footer
    style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: "6px 24px",
      textAlign: "center",
      fontSize: 10,
      color: "var(--text-tertiary)",
      lineHeight: 1.4,
    }}
  >
    <p style={{ margin: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <img src="/logo.svg" alt="RealLearn" style={{ height: 16 }} />
      <span>© {new Date().getFullYear()} RealLearn</span>
      <span>·</span>
      <span>AI can make mistakes</span>
    </p>
    <p style={{ margin: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <a href="/legal?tab=privacy" style={{ color: "inherit" }}>Privacy</a>
      <span>·</span>
      <a href="/legal?tab=terms" style={{ color: "inherit" }}>Terms</a>
      <span>·</span>
      <a href="/legal" style={{ color: "inherit" }}>Legal</a>
    </p>
  </footer>
);

export default Footer;
