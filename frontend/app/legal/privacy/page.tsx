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
        Last updated: July 7, 2026 (version 1.4)
      </p>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>1. What RealLearn Is</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn is an AI-powered educational platform. Depending on the answer mode you choose,
          it generates either a quick single-part direct answer (&quot;Fast&quot; mode) or a 3-part
          learning journey (Foundation, Mechanism, Real World &mdash; &quot;Explain&quot; mode) for
          any topic you ask about. It is powered by Google&apos;s Gemma 4 open model, served through
          Cloudflare Workers AI, and designed to help students learn through interactive quizzes
          and structured content.
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
            <strong>Usage Data:</strong> The questions you ask, your selected answer mode (Fast or
            Explain), language and learning level, quiz scores, and lesson progress.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Device Information:</strong> Your IP address and browser User-Agent (for security,
            consent tracking, and rate limiting).
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Consent Records:</strong> Timestamps of when you accepted our Privacy Policy
            (version 1.4), Terms of Service (version 1.4), and cookie consent.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Cached Lessons (temporary, not linked to you):</strong> To make the Service
            faster, generated lessons may be temporarily cached on our servers, keyed by a
            one-way hash of the question text, language, level, and answer mode. Cached lessons
            contain no account information, are not linked to your identity, and expire automatically
            (typically within a few hours).
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Voice Input (optional):</strong> If you choose to use the microphone button,
            your speech is converted to text by your browser&apos;s built-in speech recognition.
            We never receive, record, or store your audio &mdash; only the resulting text appears in
            the question box, exactly as if you had typed it. See Section 18 for details.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Read-Aloud Audio (temporary, not linked to you):</strong> If you use the
            &quot;Listen&quot; feature, the lesson text to be read aloud is sent to our server,
            which generates the audio using Microsoft&apos;s Edge text-to-speech service. The
            resulting audio may be temporarily cached on our server (for up to 24 hours), keyed
            only by a one-way hash of the text, language, and voice settings &mdash; never by your
            identity &mdash; so that repeated playback of the same text does not need to be
            re-synthesized. See Section 18 for details.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Saved Lessons:</strong> Your completed learning journeys are stored locally on
            your device (browser localStorage) for your convenience.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Learning Progress &amp; Achievements (stored locally):</strong> To power our
            engagement features, we keep a record on your device of your experience points (XP) and
            level, your daily learning streak and any streak &quot;freezes&quot;, your daily goal and
            progress toward it, an activity history of the days you studied, the achievement badges
            you have earned, and aggregate counts such as lessons completed, quizzes passed, perfect
            scores, follow-up questions asked, and which languages and subjects you have explored.
            This information is stored only in your browser&apos;s localStorage. It is <strong>not
            transmitted to or stored on our servers</strong>, and clearing your browser data or
            using &quot;Delete My Data&quot; removes it.
          </li>
          <li>
            <strong>Moderation Logs:</strong> Blocked inputs and flagged AI responses are logged
            with a pseudonymous account identifier for safety and abuse prevention. No email or
            other personal identifying information is stored with these logs, and they are deleted
            along with your other server-side data when you delete your account.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>3. How We Use Your Information</h3>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>To generate personalized learning content for you.</li>
          <li style={{ marginBottom: 4 }}>To track your progress and quiz performance.</li>
          <li style={{ marginBottom: 4 }}>
            To power gamification and engagement features &mdash; experience points, levels, daily
            streaks, daily goals, and achievement badges &mdash; which are calculated and stored
            locally on your device to help you build a learning habit.
          </li>
          <li style={{ marginBottom: 4 }}>To analyze usage patterns through Google Analytics and improve our service.</li>
          <li style={{ marginBottom: 4 }}>To comply with legal obligations and age-appropriate content rules.</li>
          <li style={{ marginBottom: 4 }}>To improve our educational content quality and service experience.</li>
          <li style={{ marginBottom: 4 }}>To protect the safety and security of our users and the Service.</li>
          <li>To communicate important service updates (if you provide contact consent).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>4. Legal Basis for Processing (GDPR)</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          If you are in the European Economic Area (EEA), United Kingdom, or Switzerland, we
          process your personal data under the following legal bases:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Consent:</strong> When you accept our Privacy Policy and Terms of Service, you
            consent to the processing of your data as described herein. You may withdraw consent at
            any time by deleting your account.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Legitimate Interest:</strong> We process usage data, IP addresses, and
            moderation logs based on our legitimate interest in providing, securing, and improving
            the Service, preventing abuse, and ensuring the safety of our users.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Contractual Necessity:</strong> Processing of your account information and
            lesson data is necessary to perform our contract with you (providing the Service).
          </li>
          <li>
            <strong>Legal Obligation:</strong> We may process data where required by applicable law
            or in response to valid legal process.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>5. Data Storage and Security</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Your account data (email, consent records) is stored securely in MongoDB Atlas. Your saved
          lessons, preferences, and all learning-progress and achievement data are stored in your
          browser&apos;s localStorage on your own device and never leave it. We use industry-standard
          security measures including Clerk for authentication with cryptographically verified session
          tokens, encrypted connections (HTTPS with HSTS), strict browser security headers (CSP,
          X-Frame-Options, HSTS preload), request rate limiting, size limits and validation on all
          input, automated content moderation, and regular security reviews. However, no method of
          electronic storage is 100% secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. AI-Generated Content</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn generates content using Google&apos;s Gemma 4 open AI model, hosted on Cloudflare
          Workers AI. All lesson content, quizzes, and explanations are AI-generated and are{" "}
          <strong>not reviewed by humans before being shown</strong>. AI-generated responses may be
          inaccurate, incomplete, or outdated. Always verify important information with qualified
          professionals or authoritative sources. The Service is for educational purposes only and
          does not provide professional advice.
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          <strong>RealLearn does not use your data to train, fine-tune, or improve any AI model.</strong>{" "}
          Your questions are sent to Cloudflare Workers AI for one-time inference only. We recommend
          reviewing{" "}
          <a href="https://www.cloudflare.com/privacypolicy/" style={{ color: "var(--accent)" }}>
            Cloudflare&apos;s Privacy Policy
          </a>{" "}
          for details on their data practices.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>7. Automated Decision-Making</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          RealLearn uses automated systems for content generation, content moderation (pattern-based
          filters and an AI safety classifier), rate limiting, and quiz scoring. These automated
          decisions do not produce legal or similarly significant effects on you. If your content is
          blocked by our moderation system and you believe this was an error, you may contact us at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>{" "}
          to request a human review.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>8. Cookies and Local Storage</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We use browser localStorage to store your consent preferences, theme settings, saved
          lessons, and your learning-progress and achievement data. We use Google Analytics cookies
          (loaded only after consent) for service improvement. We do not use tracking cookies for
          advertising. Clerk uses essential cookies for session management. For more details, please
          see our{" "}
          <a href="/legal?tab=cookies" style={{ color: "var(--accent)" }}>Cookie Policy</a>.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>9. Your Rights</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          Depending on your location, you may have the following rights regarding your personal data:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Access:</strong> You can export all your data using the &quot;Export My Data&quot; feature.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Deletion:</strong> You can delete your account and all associated data using
            the &quot;Delete My Data&quot; feature.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Rectification:</strong> You can update your email through your Clerk account settings.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Objection:</strong> You may decline consent, which will prevent us from storing
            new data, though previously stored data may remain until deletion.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Data Portability:</strong> You can export your data in a machine-readable JSON
            format using the &quot;Export My Data&quot; feature.
          </li>
          <li>
            <strong>Restriction:</strong> You may request that we restrict processing of your data
            by contacting us.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>10. Third-Party Services</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          We use the following third-party services:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Clerk</strong> (clerk.com) &mdash; Authentication and user management.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Cloudflare Workers AI</strong> (cloudflare.com) &mdash; AI content generation using
            Google&apos;s Gemma 4 open model. Your question, language, and difficulty level are sent
            for one-time inference. No user identity is included in the API call.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Google Analytics</strong> &mdash; Website analytics. Loaded only after cookie consent.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Serper</strong> (google.serper.dev) &mdash; Real-world news context for Explain-mode
            lessons. Only your question topic and language are sent; Fast-mode does not use this service.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Browser Speech Recognition (Web Speech API)</strong> &mdash; Voice input is
            provided by your own browser. RealLearn never receives or stores your audio.
          </li>
          <li>
            <strong>Microsoft Edge Text-to-Speech</strong> &mdash; The &quot;Listen&quot; read-aloud
            feature uses Microsoft&apos;s Edge neural text-to-speech service. See{" "}
            <a href="https://privacy.microsoft.com/privacystatement" style={{ color: "var(--accent)" }}>
              Microsoft&apos;s Privacy Statement
            </a>.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>11. Data Retention</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We retain your account data (email, consent records) for as long as your account is active.
          When you delete your account, we delete your data from our servers within 30 days, except
          where retention is required by law or for legitimate business purposes (e.g., fraud
          prevention, security). Anonymously cached lessons expire automatically, typically within a
          few hours. Saved lessons stored in your browser&apos;s localStorage remain until you clear
          them or use the &quot;Delete My Data&quot; feature.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>12. International Transfers</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Your data may be processed in countries other than your own (including the United States,
          where our cloud providers operate). We ensure appropriate safeguards are in place for any
          international data transfers, including Standard Contractual Clauses where applicable.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>13. Data Breach Notification</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          In the event of a personal data breach that is likely to result in a risk to your rights
          and freedoms, we will notify the relevant supervisory authority within 72 hours of becoming
          aware of the breach, and will notify affected users without undue delay where required by
          applicable law. We maintain incident response procedures and will provide information about
          the nature of the breach, the likely consequences, and the measures taken to address it.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>14. Changes to This Policy</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes by posting the new policy on this page, updating the &quot;Last updated&quot; date,
          and requiring re-acceptance through an in-app prompt. Continued use of the service after
          changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>15. Contact Us</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you have questions about this Privacy Policy or your data, please contact us at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>{" "}
          or visit our website at{" "}
          <a href="https://reallearn.site" style={{ color: "var(--accent)" }}>
            reallearn.site
          </a>.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>16. GDPR (European Users)</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you are in the European Economic Area, you have the right to access, rectify,
          erase, restrict, or object to processing of your personal data. You also have the
          right to data portability and to lodge a complaint with a supervisory authority.
          Our lawful basis for processing your data is your consent and our legitimate interest
          in providing the educational service. You can exercise these rights through the
          &quot;Export My Data&quot; and &quot;Delete My Data&quot; features, or by contacting us.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>17. CCPA (California Users)</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          If you are a California resident, you have the following rights under the California
          Consumer Privacy Act (CCPA), as amended by the CPRA:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to Know:</strong> You can request disclosure of the categories and specific
            pieces of personal information we have collected about you.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to Delete:</strong> You can request deletion of your personal information
            using the &quot;Delete My Data&quot; feature.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to Correct:</strong> You can request correction of inaccurate personal
            information.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to Opt-Out:</strong> We do not sell your personal information. We do not
            share personal information for cross-context behavioral advertising.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to Non-Discrimination:</strong> We will not discriminate against you for
            exercising your CCPA rights.
          </li>
          <li>
            <strong>Categories Collected:</strong> Identifiers (email, Clerk ID, IP address),
            internet activity (usage data, questions asked), device information (User-Agent),
            and consent records.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>18. Accessibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We are committed to making our Service accessible to all users. We aim to conform to
          WCAG 2.1 Level AA standards. If you encounter any accessibility barriers, please
          contact us and we will work to address them.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>19. Sharing Your Results</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          When you finish a learning journey, RealLearn lets you optionally share a result card.
          This card is generated entirely on your device and may include the question you asked,
          your quiz score, your level, and your current streak. Nothing is shared automatically &mdash;
          a share card is only created and sent when you tap the share or copy button. RealLearn
          does not upload, store, or receive a copy of shared result cards.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          20. Voice Features (Microphone &amp; Read-Aloud)
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn offers two optional voice features:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: "8px 0 0" }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Voice input (browser-based):</strong> The microphone is used only while you
            actively hold a voice-input session, and only after you grant your browser permission.
            <strong> We never receive, transmit, record, or store your audio on our servers.</strong>
          </li>
          <li>
            <strong>Listen (read-aloud, server-generated):</strong> When you press the
            &quot;Listen&quot; button, the lesson text is sent to our server, which synthesizes
            the audio using Microsoft&apos;s Edge neural text-to-speech service. No account
            identity is attached. Audio may be cached anonymously for up to 24 hours.
          </li>
        </ul>
      </section>
    </article>
  );
}
