export default function CookiePolicy() {
  return (
    <article
      style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        padding: "32px 28px",
        border: "1px solid var(--border-subtle)",
        lineHeight: 1.7,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-playfair)",
          fontWeight: 700,
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        Cookie Policy
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>
        Last updated: June 28, 2026
      </p>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>1. What Are Cookies</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Cookies are small text files stored on your device by your browser. They help websites
          remember your preferences and improve your experience. RealLearn uses minimal cookies
          and primarily relies on browser localStorage for data persistence.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>2. How We Use Cookies</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          RealLearn uses the following:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Authentication (Clerk):</strong> Clerk, our authentication provider, uses
            cookies and similar technologies to manage your session and keep you signed in.
            These are necessary for the Service to function.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Local Storage:</strong> We use browser localStorage (not cookies) to store
            your consent preferences, theme settings, and saved lessons.
          </li>
          <li>
            <strong>Essential Cookies:</strong> We may use strictly necessary cookies for security
            and session management.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>3. Third-Party Cookies</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Our authentication provider Clerk may set cookies on your device. Please review
          Clerk&apos;s privacy policy for details on how they use cookies. We do not use advertising
          or tracking cookies.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>4. Managing Cookies</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          You can control and delete cookies through your browser settings. Disabling cookies may
          affect your ability to use certain features of the Service, including staying signed in.
          You can clear your localStorage at any time using the &quot;Delete My Data&quot; feature in the app.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>5. Updates to This Policy</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We may update this Cookie Policy from time to time. We will notify you of any changes
          by posting the new policy on this page and updating the &quot;Last updated&quot; date.
        </p>
      </section>

      <section>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. Contact Us</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you have questions about our use of cookies, please contact us at{" "}
          <a href="mailto:support@reallearn.esamz.site" style={{ color: "var(--accent)" }}>
            support@reallearn.esamz.site
          </a>.
        </p>
      </section>
    </article>
  );
}
