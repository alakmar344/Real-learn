export default function PrivacyPolicy() {
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
        Privacy Policy
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>
        Last updated: June 28, 2026
      </p>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>1. What RealLearn Is</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn is an AI-powered educational platform that generates 3-part learning journeys
          (Foundation, Mechanism, Real World) for any topic you ask about. It is powered by Google
          Gemma 4 and designed to help students learn through interactive quizzes and structured content.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>2. Information We Collect</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          We collect the following information to provide and improve our service:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Account Information:</strong> Your email address and Clerk ID (provided by our
            authentication provider, Clerk).
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Usage Data:</strong> The questions you ask, your selected language and learning
            level, quiz scores, and lesson progress.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Device Information:</strong> Your IP address (for security and consent tracking).
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Consent Records:</strong> Timestamps of when you accepted our Privacy Policy,
            Terms of Service, and cookie consent.
          </li>
          <li>
            <strong>Saved Lessons:</strong> Your completed learning journeys are stored locally on
            your device (browser localStorage) for your convenience.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>3. How We Use Your Information</h3>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>To generate personalized learning content for you.</li>
          <li style={{ marginBottom: 4 }}>To track your progress and quiz performance.</li>
          <li style={{ marginBottom: 4 }}>To comply with legal obligations and age-appropriate content rules.</li>
          <li style={{ marginBottom: 4 }}>To improve our AI models and educational content quality.</li>
          <li>To communicate important service updates (if you provide contact consent).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>4. Data Storage and Security</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Your account data (email, consent records) is stored securely in MongoDB. Your saved
          lessons and preferences are stored in your browser&apos;s localStorage. We use industry-standard
          security measures including Clerk for authentication and encrypted connections (HTTPS).
          However, no method of electronic storage is 100% secure, and we cannot guarantee absolute
          security.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>5. Age Restrictions and Child Safety</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn is intended for users <strong>13 years of age and older</strong>. We do not
          knowingly collect personal information from children under 13. If we become aware that a
          child under 13 has provided us with personal information, we will take steps to delete
          that information. We employ content filtering guardrails to prevent harmful, inappropriate,
          or illegal content from being served to any user.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. Cookies and Local Storage</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We use browser localStorage to store your consent preferences, theme settings, and saved
          lessons. We do not use tracking cookies for advertising. You can clear your localStorage
          at any time through your browser settings or by using the &quot;Delete My Data&quot; feature in the app.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>7. Your Rights</h3>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Access:</strong> You can export all your data using the &quot;Export My Data&quot; feature.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Deletion:</strong> You can delete your account and all associated data using
            the &quot;Delete My Data&quot; feature. This removes your MongoDB records, Clerk account,
            and all local data.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Rectification:</strong> You can update your email through your Clerk account settings.
          </li>
          <li>
            <strong>Objection:</strong> You may decline consent, which will prevent us from storing
            new data, though previously stored data may remain until deletion.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>8. Third-Party Services</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We use the following third-party services:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Clerk</strong> (clerk.com) — Authentication and user management.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Google Gemma 4</strong> — AI content generation.
          </li>
          <li>
            <strong>Serper</strong> — Real-world context fetching for learning content.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>9. Data Retention</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We retain your data for as long as your account is active or as needed to provide
          services. When you delete your account, we delete your data from our servers within a
          reasonable timeframe, except where retention is required by law.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>10. International Transfers</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Your data may be processed in countries other than your own. We ensure appropriate
          safeguards are in place for any international data transfers.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>11. Changes to This Policy</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We may update this Privacy Policy from time to time. We will notify you of any changes
          by posting the new policy on this page and updating the &quot;Last updated&quot; date.
          Continued use of the service after changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>12. Contact Us</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you have questions about this Privacy Policy or your data, please contact us through
          our support channels or visit our website at{" "}
          <a
            href="https://reallearn.esamz.site"
            style={{ color: "var(--accent)" }}
          >
            reallearn.esamz.site
          </a>.
        </p>
      </section>

      <section>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>13. CCPA / CPRA (California Residents)</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you are a California resident, you have the right to request disclosure of the
          categories and specific pieces of personal information we collect, the purposes for
          collecting, and the third parties with whom we share it. You also have the right to
          request deletion of your personal information and to opt out of the sale or sharing
          of your personal information. We do not sell or share personal information for
          cross-context behavioral advertising. To exercise these rights, please use the
          &quot;Export My Data&quot; and &quot;Delete My Data&quot; features in the app, or contact us
          through our website.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>14. GDPR (European Users)</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you are in the European Economic Area, you have the right to access, rectify,
          erase, restrict, or object to processing of your personal data. You also have the
          right to data portability and to lodge a complaint with a supervisory authority.
          Our lawful basis for processing your data is your consent and our legitimate interest
          in providing the educational service. You can exercise these rights through the
          &quot;Export My Data&quot; and &quot;Delete My Data&quot; features, or by contacting us.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>15. Accessibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We are committed to making our Service accessible to all users. We aim to conform to
          WCAG 2.1 Level AA standards. If you encounter any accessibility barriers, please
          contact us and we will work to address them.
        </p>
      </section>
    </article>
  );
}
