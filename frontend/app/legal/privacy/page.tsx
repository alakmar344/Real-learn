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
            <strong>Device Information:</strong> Your IP address and browser User-Agent (for security,
            consent tracking, and rate limiting).
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Consent Records:</strong> Timestamps of when you accepted our Privacy Policy
            (version 1.0), Terms of Service (version 1.0),
            and cookie consent.
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
          <li style={{ marginBottom: 4 }}>To analyze usage patterns through Google Analytics and improve our service.</li>
          <li style={{ marginBottom: 4 }}>To comply with legal obligations and age-appropriate content rules.</li>
          <li style={{ marginBottom: 4 }}>To improve our educational content quality and service experience.</li>
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
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>5. AI-Generated Content</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn generates content using Google Gemma 4, an AI model. All lesson content, quizzes,
          and explanations are AI-generated and are <strong>not reviewed by humans before being shown</strong>.
          AI-generated responses may be inaccurate, incomplete, or outdated. You should verify
          important information with qualified professionals or authoritative sources. The Service
          is for educational purposes only and does not provide professional advice (medical, legal,
          financial, etc.).
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          <strong>RealLearn does not use your data to train, fine-tune, or improve any AI model.</strong>{" "}
          Your questions are sent to Google&apos;s Gemma API for one-time inference only. We do not
          store your questions or generated lessons on our servers. However, please note that your
          questions are transmitted to Google&apos;s API, and Google&apos;s own terms of service may govern
          how they handle that data. We recommend reviewing{" "}
          <a href="https://policies.google.com/privacy" style={{ color: "var(--accent)" }}>
            Google&apos;s Privacy Policy
          </a>{" "}
          for details on their data practices.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. Cookies and Local Storage</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We use browser localStorage to store your consent preferences, theme settings, and saved
          lessons. We use Google Analytics cookies (loaded only after consent) for service improvement.
          We do not use tracking cookies for advertising. Clerk, our authentication provider,
          uses essential cookies for session management. For more details, please see our{" "}
          <a href="/legal?tab=cookies" style={{ color: "var(--accent)" }}>Cookie Policy</a>.
          You can clear your localStorage at any time through your browser settings or by using the
          &quot;Delete My Data&quot; feature in the app.
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
            <strong>Google Gemma 4</strong> — AI content generation. Your question, chosen language,
            and difficulty level are sent to Google&apos;s API for one-time inference. No user identity
            is included in the API call. Google&apos;s own data practices apply to API requests.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Google Analytics</strong> — Website analytics to understand usage patterns
            and improve our service. Loaded only after cookie consent.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Serper</strong> (google.serper.dev) — Real-world context fetching for learning content.
          </li>
          <li>
            <strong>ipify</strong> (api.ipify.org) — IP address detection for security and consent tracking.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>9. Data Retention</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We retain your account data (email, consent records) for as long as your account is active.
          When you delete your account, we delete your data from our servers within 30 days, except
          where retention is required by law or for legitimate business purposes (e.g., fraud
          prevention, security). Saved lessons stored in your browser&apos;s localStorage remain until
          you clear them or use the &quot;Delete My Data&quot; feature.
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
          If you have questions about this Privacy Policy or your data, please contact us at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>{" "}
          or visit our website at{" "}
          <a
            href="https://reallearn.site"
            style={{ color: "var(--accent)" }}
          >
            reallearn.site
          </a>.
        </p>
      </section>

      <section>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>13. GDPR (European Users)</h3>
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
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>14. Accessibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We are committed to making our Service accessible to all users. We aim to conform to
          WCAG 2.1 Level AA standards. If you encounter any accessibility barriers, please
          contact us and we will work to address them.
        </p>
      </section>
    </article>
  );
}
