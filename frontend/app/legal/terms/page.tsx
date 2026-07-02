export default function TermsOfService() {
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
        Terms of Service
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>
        Last updated: July 2, 2026
      </p>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>1. Acceptance of Terms</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          By accessing or using RealLearn (&quot;the Service&quot;), you agree to be bound by these Terms of Service
          (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Service. These Terms
          apply to all visitors, users, and others who access or use the Service.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>2. Description of Service</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn is an AI-powered educational platform that generates 3-part learning journeys
          (Foundation, Mechanism, Real World) for user-requested topics. The service includes
          interactive quizzes, progress tracking, and multilingual support. It also includes
          optional engagement features — experience points (XP), levels, daily learning streaks,
          daily goals, achievement badges, and shareable result cards — that are stored locally on
          your device to help you build a learning habit, and optional voice features: microphone
          voice input and &quot;Listen&quot; read-aloud, both powered by your browser&apos;s built-in
          speech services. To improve speed, lessons may be served from a short-lived,
          anonymous server-side cache when the same question has recently been asked. RealLearn is
          intended for educational purposes only.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>3. Eligibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          You must be at least <strong>13 years old</strong> to use this Service. By using RealLearn,
          you represent and warrant that you meet this age requirement. If you are under 18, you
          confirm that you have your parent or guardian&apos;s permission to use the Service. We do not
          knowingly allow children under 13 to use this Service.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>4. User Accounts</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          You are responsible for safeguarding your account credentials (managed via Clerk). You
          agree to notify us immediately of any unauthorized use of your account. We are not liable
          for any loss or damage arising from your failure to comply with this security obligation.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>5. Acceptable Use</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          You agree not to use the Service:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>For any unlawful purpose or in violation of any laws.</li>
          <li style={{ marginBottom: 4 }}>To harass, abuse, or harm another person or entity.</li>
          <li style={{ marginBottom: 4 }}>To generate content that is harmful, violent, sexually explicit, or discriminatory.</li>
          <li style={{ marginBottom: 4 }}>To interfere with or disrupt the integrity or performance of the Service.</li>
          <li style={{ marginBottom: 4 }}>To attempt to gain unauthorized access to the Service or related systems.</li>
          <li style={{ marginBottom: 4 }}>To reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
          <li>
            To use scripts, bots, automation, or other artificial means to inflate or manipulate
            engagement metrics such as XP, levels, streaks, daily goals, or achievement badges.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. AI Content Disclaimer</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          <strong>Important:</strong> You are interacting with an AI system. All responses are
          generated by Google Gemma 4 and are <strong>not reviewed by humans before being shown</strong>.
          Lessons are intentionally written in a warm, natural, conversational style that may feel
          like a human tutor — but every lesson, quiz, and explanation is machine-generated, and
          no human is involved in the conversation.
          The information provided may be inaccurate, incomplete, or outdated. RealLearn does not
          guarantee the accuracy, reliability, or completeness of any AI-generated content. The
          content is for educational purposes only and should not be considered professional advice
          (medical, legal, financial, etc.). Always verify important information with qualified
          professionals or authoritative sources.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>7. Intellectual Property</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          The Service and its original content, features, and functionality are owned by RealLearn
          and are protected by international copyright, trademark, patent, and other intellectual
          property laws. Your saved lessons and progress data remain your property, though you
          grant us a limited license to store and display them as part of the Service.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>8. Termination</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We may terminate or suspend your access to the Service immediately, without prior notice
          or liability, for any reason, including if you breach these Terms. Upon termination, your
          right to use the Service will immediately cease. You may also terminate your account at
          any time using the &quot;Delete My Data&quot; feature.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>9. Limitation of Liability</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          To the maximum extent permitted by law, RealLearn shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss of profits, data,
          or goodwill, arising out of or in connection with your use of the Service. Our total
          liability to you for any claim arising out of these Terms shall not exceed the amount
          you paid us in the twelve months prior to the event giving rise to the claim (which is
          zero for our free service).
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>10. Content Moderation and Guardrails</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We employ automated content filtering to ensure the Service remains safe and appropriate
          for all users. Blocked inputs and flagged responses are logged and may be reviewed by
          humans for moderation purposes. We reserve the right to remove or restrict access to
          content that violates our community guidelines or these Terms. We also maintain guardrails
          to prevent the AI from generating harmful, illegal, or age-inappropriate content.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>11. Governing Law</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          These Terms shall be governed by and construed in accordance with the laws of India,
          without regard to its conflict of law provisions. Any disputes arising from these Terms
          or your use of the Service shall be resolved in the courts located in India.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>12. Changes to Terms</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We reserve the right to modify or replace these Terms at any time. If a revision is
          material, we will provide at least 30 days&apos; notice prior to any new terms taking effect.
          What constitutes a material change will be determined at our sole discretion. By
          continuing to access or use the Service after any revisions become effective, you agree
          to be bound by the updated terms.
        </p>
      </section>

      <section>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>13. Contact Information</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you have any questions about these Terms of Service or our legal policies, please
          contact us at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>.
          You may also visit our website at{" "}
          <a
            href="https://reallearn.site"
            style={{ color: "var(--accent)" }}
          >
            reallearn.site
          </a>.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>14. Copyright and Trademark</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn, the RealLearn logo, and all related names, logos, and slogans are the
          intellectual property of alakmar344. All content generated by the Service is the property
          of the user who requested it, subject to our limited license to display it as part of the
          Service. Unauthorized use of our branding is prohibited.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>15. Data Retention and Deletion</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We retain your account and conversation data only as long as necessary to provide the
          service or comply with legal obligations. When you delete your account, we delete your
          data from our servers within 30 days. Anonymously cached lessons (used to answer repeat
          questions faster) are keyed by a hash of the question — not by your identity — and expire
          automatically, typically within a few hours. Saved lessons in your browser remain until you
          clear them or use the &quot;Delete My Data&quot; feature. For more details, see our{" "}
          <a href="/legal?tab=privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>16. Accessibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We strive to make our Service accessible to all users and aim to conform to WCAG 2.1
          Level AA standards. If you experience any accessibility issues, please contact us and
          we will make reasonable efforts to address them.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>17. Gamification &amp; Virtual Rewards</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          The Service offers engagement features including experience points (XP), levels, daily
          streaks, streak freezes, daily goals, and achievement badges (collectively,
          &quot;Virtual Rewards&quot;). Virtual Rewards are provided for motivational and entertainment
          purposes only. They have <strong>no monetary value</strong>, cannot be purchased,
          redeemed, transferred, or exchanged for cash or any other benefit, and confer no
          ownership rights. Because this data is stored locally in your browser, it is tied to that
          browser and device and may be lost if you clear your browser data, switch devices or
          browsers, or use the &quot;Delete My Data&quot; feature. We may add, modify, reset, or
          discontinue any Virtual Reward or engagement feature at any time without notice or
          liability. Shareable result cards are generated on your device; you are responsible for
          any content you choose to share and for complying with the terms of any platform you
          share to.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>18. Voice Features</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          The Service offers optional voice input (speech-to-text) and &quot;Listen&quot; read-aloud
          (text-to-speech) features. Both rely on your browser&apos;s built-in Web Speech API:
          availability, accuracy, and voice quality depend on your browser, device, and language,
          and the features may be unavailable in some browsers. Voice input requires you to grant
          microphone permission to your browser; the microphone is used only during an active
          voice-input session and RealLearn never receives or stores your audio. Speech recognition
          may be processed by your browser vendor&apos;s speech service under that vendor&apos;s own
          terms. Voice features are provided &quot;as is&quot; — transcription errors are possible,
          and you are responsible for reviewing the transcribed text before submitting a question.
          We may modify or discontinue voice features at any time without liability.
        </p>
      </section>
    </article>
  );
}
