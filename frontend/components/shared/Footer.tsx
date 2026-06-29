"use client";

const Footer = () => (
  <footer
    style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: "12px 24px",
      textAlign: "center",
      fontSize: 11,
      color: "var(--text-tertiary)",
      lineHeight: 1.5,
    }}
  >
    <p style={{ margin: 0 }}>
      <a href="/legal?tab=privacy" style={{ color: "inherit" }}>Privacy</a>
      {" · "}
      <a href="/legal?tab=terms" style={{ color: "inherit" }}>Terms</a>
      {" · "}
      <a href="/legal" style={{ color: "inherit" }}>Legal</a>
      {" · "}
      © {new Date().getFullYear()} RealLearn
    </p>
  </footer>
);

export default Footer;
