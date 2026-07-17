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
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        Cookie Policy
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>
        Last updated: July 15, 2026 (version 2.2)
      </p>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>1. What Are Cookies</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Cookies are small text files stored on your device by your browser. They help websites
          remember your preferences and improve your experience. RealLearn uses minimal cookies
          and primarily relies on browser storage (localStorage and IndexedDB) for data
          persistence.
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
            <strong>Analytics (Google Analytics):</strong> We use Google Analytics to understand
            how users interact with our service and improve the learning experience. This is loaded
            only after you give cookie consent and helps us track usage patterns and performance.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Local Storage:</strong> We use browser localStorage (not cookies) to store
            your consent preferences, theme settings, saved-lesson history index, your
            learning-progress and achievement data (experience points, level, daily streaks, daily
            goals, activity history, and badges), and your personalization data (the date you
            first used RealLearn on this device — shown as a &quot;learning together for N
            days&quot; counter — and once-per-day markers that stop a seasonal or time-of-day
            greeting from appearing twice in one day), and browser IndexedDB (not cookies) to
            store the full content of your saved lessons. This data stays on your device and is
            not sent to our servers.
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
          Clerk&apos;s privacy policy for details on how they use cookies. We use Google Analytics,
          a web analytics service provided by Google, which sets cookies to analyze how visitors
          use our service. You can review Google&apos;s Privacy Policy at{" "}
          <a href="https://policies.google.com/privacy" style={{ color: "var(--accent)" }}>
            policies.google.com/privacy
          </a>. We do not use advertising or tracking cookies for marketing purposes.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>4. Managing Cookies</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          You can control and delete cookies through your browser settings. Disabling cookies may
          affect your ability to use certain features of the Service, including staying signed in.
          You can clear your localStorage and IndexedDB at any time using the &quot;Delete My
          Data&quot; feature in the app, which clears both.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>5. Updates to This Policy</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We may update this Cookie Policy from time to time. We will notify you of any changes
          by posting the new policy on this page and updating the &quot;Last updated&quot; date.
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          <strong>Version 2.2 (effective July 15, 2026).</strong> Updated the Local Storage
          disclosure to cover new locally-stored personalization data: the date you first used
          RealLearn on this device and once-per-day markers for seasonal greetings. This data
          never leaves your device. Because the disclosure changed, the consent banner will ask
          for your choice again.
        </p>
      </section>

      <section>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. Contact Us</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you have questions about our use of cookies, please contact us at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>.
        </p>
      </section>
    </article>
  );
}
