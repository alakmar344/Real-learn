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
        Last updated: July 7, 2026 (version 1.5)
      </p>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>1. What RealLearn Is</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn is an AI-powered educational platform. Depending on the answer mode you choose,
          it generates either a quick single-part direct answer (&quot;Fast&quot; mode) or a 3-part
          learning journey (Foundation, Mechanism, Real World — &quot;Explain&quot; mode) for any
          topic you ask about. It is powered by Google&apos;s Gemma 4 open model, served through
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
            (version 1.5), Terms of Service (version 1.5), and cookie consent.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Cached Lessons (temporary, not linked to you):</strong> To make the Service
            faster, generated lessons may be temporarily cached on our servers, keyed by a
            one-way hash of the question text, language, level, and answer mode. Cached lessons contain no
            account information, are not linked to your identity, and expire automatically
            (typically within a few hours).
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Voice Input (optional):</strong> If you choose to use the microphone button,
            your speech is converted to text by your browser&apos;s built-in speech recognition.
            We never receive, record, or store your audio — only the resulting text appears in
            the question box, exactly as if you had typed it. See Section 16 for details.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Read-Aloud Audio (temporary, not linked to you):</strong> If you use the
            &quot;Listen&quot; feature, the lesson text to be read aloud is sent to our server,
            which generates the audio using Microsoft&apos;s Edge text-to-speech service. The
            resulting audio may be temporarily cached on our server (for up to 24 hours), keyed
            only by a one-way hash of the text, language, and voice settings — never by your
            identity — so that repeated playback of the same text does not need to be
            re-synthesized. See Section 16 for details.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Saved Lessons:</strong> Your completed learning journeys are stored locally on
            your device (browser localStorage) for your convenience.
          </li>
          <li>
            <strong>Learning Progress &amp; Achievements (stored locally):</strong> To power our
            engagement features, we keep a record on your device of your experience points (XP) and
            level, your daily learning streak and any streak &quot;freezes&quot;, your daily goal and
            progress toward it, an activity history of the days you studied (dates and how many
            parts you completed each day), the achievement badges you have earned, and aggregate
            counts such as lessons completed, quizzes passed, perfect scores, follow-up questions
            asked, and which languages and subjects you have explored. This information is stored
            only in your browser&apos;s localStorage. It is <strong>not transmitted to or stored on
            our servers</strong>, and clearing your browser data or using &quot;Delete My Data&quot;
            removes it.
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
            To power gamification and engagement features — experience points, levels, daily
            streaks, daily goals, and achievement badges — which are calculated and stored locally
            on your device to help you build a learning habit.
          </li>
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
          lessons, preferences, and all learning-progress and achievement data (XP, level, streaks,
          daily goals, activity history, and badges) are stored in your browser&apos;s localStorage
          on your own device and never leave it. We use industry-standard
          security measures including Clerk for authentication with cryptographically verified
          session tokens, encrypted connections (HTTPS with HSTS), strict browser security headers,
          request rate limiting, size limits and validation on all input, and automated content
          moderation. However, no method of electronic storage is 100% secure, and we cannot
          guarantee absolute security.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>5. AI-Generated Content</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn generates content using Google&apos;s Gemma 4 open AI model, hosted on Cloudflare
          Workers AI. All lesson content (in both Fast and Explain modes), quizzes,
          and explanations are AI-generated and are <strong>not reviewed by humans before being shown</strong>.
          AI-generated responses may be inaccurate, incomplete, or outdated. You should verify
          important information with qualified professionals or authoritative sources. The Service
          is for educational purposes only and does not provide professional advice (medical, legal,
          financial, etc.).
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          Lesson content is written in a natural, conversational, human-like style — but it is
          entirely AI-generated. Nothing in the Service is written or reviewed by a human tutor
          before you see it.
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          <strong>RealLearn does not use your data to train, fine-tune, or improve any AI model.</strong>{" "}
          Your questions are sent to Cloudflare Workers AI (which hosts the Gemma model) for
          one-time inference only. We do not
          store your questions or generated lessons in a form linked to your account. To improve
          speed, a generated lesson may be kept in a short-lived server-side cache keyed by a
          one-way hash of the question text (not by your identity) and is deleted automatically
          when it expires. However, please note that your
          questions are transmitted to Cloudflare&apos;s API, and Cloudflare&apos;s own terms may
          govern how they handle that data. We recommend reviewing{" "}
          <a href="https://www.cloudflare.com/privacypolicy/" style={{ color: "var(--accent)" }}>
            Cloudflare&apos;s Privacy Policy
          </a>{" "}
          for details on their data practices.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. Cookies and Local Storage</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We use browser localStorage to store your consent preferences, theme settings, saved
          lessons, and your learning-progress and achievement data (XP, level, streaks, daily goals,
          activity history, and badges). We use Google Analytics cookies (loaded only after consent) for service improvement.
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
            <strong>Cloudflare Workers AI</strong> (cloudflare.com) — AI content generation using
            Google&apos;s Gemma 4 open model hosted on Cloudflare&apos;s network. Your question,
            chosen language, and difficulty level are sent to Cloudflare&apos;s API for one-time
            inference (for both lesson generation and automated content moderation). No user
            identity is included in the API call. Cloudflare&apos;s own data practices apply to API
            requests.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Google Analytics</strong> — Website analytics to understand usage patterns
            and improve our service. Loaded only after cookie consent.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Serper</strong> (google.serper.dev) — Real-world news context fetching for the
            &quot;Real World&quot; part of Explain-mode lessons. Only your question topic and
            language are sent; Fast-mode answers do not use this service.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Browser Speech Recognition (Web Speech API)</strong> — Voice <em>input</em> is
            provided by your own browser. Depending on your browser and device, speech recognition
            may be processed by the browser vendor&apos;s speech service (for example, Google for
            Chrome). RealLearn never receives or stores your audio; your browser vendor&apos;s
            privacy policy governs that processing.
          </li>
          <li>
            <strong>Microsoft Edge Text-to-Speech</strong> — The &quot;Listen&quot; (read-aloud)
            feature is generated by our server using Microsoft&apos;s Edge neural text-to-speech
            service. Only the lesson text to be read and the chosen language/voice settings are
            sent; no account identity, email, or IP address of yours is included in the request
            to Microsoft. Microsoft&apos;s own data practices apply to that processing — see{" "}
            <a href="https://privacy.microsoft.com/privacystatement" style={{ color: "var(--accent)" }}>
              Microsoft&apos;s Privacy Statement
            </a>.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>9. Data Retention</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We retain your account data (email, consent records) for as long as your account is active.
          When you delete your account, we delete your data from our servers within 30 days, except
          where retention is required by law or for legitimate business purposes (e.g., fraud
          prevention, security). Anonymously cached lessons expire and are deleted automatically,
          typically within a few hours of being generated. Saved lessons stored in your
          browser&apos;s localStorage remain until
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

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>14. Accessibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We are committed to making our Service accessible to all users. We aim to conform to
          WCAG 2.1 Level AA standards. If you encounter any accessibility barriers, please
          contact us and we will work to address them.
        </p>
      </section>

      <section>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>15. Sharing Your Results</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          When you finish a learning journey, RealLearn lets you optionally share a result card.
          This card is generated entirely on your device and may include the question you asked,
          your quiz score, your level, and your current streak. Nothing is shared automatically —
          a share card is only created and sent when you tap the share or copy button. If you
          choose to share, the image and text are handed to your own device&apos;s share sheet,
          clipboard, or downloads, and any onward distribution (for example to a social network or
          messaging app) is controlled by you and governed by the privacy policy of the destination
          you select. RealLearn does not upload, store, or receive a copy of shared result cards.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          16. Voice Features (Microphone &amp; Read-Aloud)
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn offers two optional voice features:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: "8px 0 0" }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Voice input (browser-based):</strong> The microphone is used only while you
            actively hold a voice-input session, and only after you grant your browser permission.
            Your speech is converted to text by the browser&apos;s built-in Web Speech API (or the
            browser vendor&apos;s speech service) and the resulting text is placed into the
            question box. <strong>We never receive, transmit, record, or store your audio on our
            servers.</strong> You can revoke microphone permission at any time in your browser
            settings; the feature is entirely optional and typing always works.
          </li>
          <li>
            <strong>Listen (read-aloud, server-generated):</strong> When you press the
            &quot;Listen&quot; button, the lesson text to be read is sent to our server, which
            synthesizes the audio using Microsoft&apos;s Edge neural text-to-speech service and
            streams the resulting MP3 back to your device. Only the lesson text and the chosen
            language/voice settings are sent to the speech service — no account identity is
            attached. To save bandwidth, the generated audio may be cached on our server for up
            to 24 hours, keyed by a one-way hash of the text and voice settings (never by your
            identity), and your browser may also cache it privately for up to 24 hours. The
            feature never records anything: it converts existing lesson text to audio; your
            microphone is not involved.
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          17. Legal Bases and Regional Rights
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Where required by law, we process personal data under one or more lawful bases: your
          consent (for optional analytics and policy acceptance records), our contract with you
          (to provide account access and learning features), and our legitimate interests (to keep
          the service secure, prevent abuse, and improve reliability). Depending on your region
          (including the EEA/UK and California), you may have rights to access, delete, correct,
          port, or restrict processing of your personal data, and to appeal where legally available.
          You can exercise available rights using in-product tools (&quot;Export My Data&quot;,
          &quot;Delete My Data&quot;) or by contacting us.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          18. Security Events and Incident Response
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We maintain technical and organizational safeguards such as token verification, strict
          input validation, rate limiting, and hardened security headers. If we confirm a personal
          data breach affecting your information, we will investigate promptly, take containment and
          remediation actions, and provide legally required notifications to users and regulators
          within applicable timelines.
        </p>
      </section>
    </article>
  );
}
