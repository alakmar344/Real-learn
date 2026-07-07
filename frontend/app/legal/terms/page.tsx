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
        Last updated: July 7, 2026 (version 1.4)
      </p>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>1. Acceptance of Terms</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          By accessing or using RealLearn (&quot;the Service&quot;), you agree to be bound by these
          Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use
          the Service. These Terms apply to all visitors, users, and others who access or use the
          Service. Your use of the Service constitutes a binding legal agreement between you and
          RealLearn.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>2. Description of Service</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn is an AI-powered educational platform that generates learning content for
          user-requested topics in two answer modes: &quot;Fast&quot; (a single direct answer part
          with a quick quiz) and &quot;Explain&quot; (a 3-part learning journey &mdash; Foundation,
          Mechanism, Real World). The service includes interactive quizzes, progress tracking,
          multilingual support, optional engagement features (XP, levels, streaks, daily goals,
          badges, shareable result cards), and optional voice features (browser-based voice input and
          server-generated read-aloud). RealLearn is intended for educational purposes only.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>3. Eligibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          You must be at least <strong>13 years old</strong> to use this Service. By using RealLearn,
          you represent and warrant that you meet this age requirement. If you are under 18, you
          confirm that you have your parent or guardian&apos;s permission to use the Service. We do not
          knowingly allow children under 13 to use this Service. If we learn that a user is under 13,
          we will terminate their account and delete their data.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>4. User Accounts</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          You are responsible for safeguarding your account credentials (managed via Clerk). You
          agree to notify us immediately of any unauthorized use of your account. We are not liable
          for any loss or damage arising from your failure to comply with this security obligation.
          You may not share your account with others or allow others to use your account.
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
          <li style={{ marginBottom: 4 }}>
            To use scripts, bots, automation, or other artificial means to inflate or manipulate
            engagement metrics such as XP, levels, streaks, daily goals, or achievement badges.
          </li>
          <li>
            To use the Service for any purpose that could damage, disable, overburden, or impair
            the Service or interfere with any other party&apos;s use of the Service.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. AI Content Disclaimer</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          <strong>Important:</strong> You are interacting with an AI system. All responses (in both
          Fast and Explain modes) are generated by Google&apos;s Gemma 4 open model, hosted on
          Cloudflare Workers AI, and are <strong>not reviewed by humans before being shown</strong>.
          Lessons are written in a warm, natural, conversational style that may feel like a human
          tutor &mdash; but every lesson, quiz, and explanation is machine-generated. The information
          provided may be inaccurate, incomplete, or outdated. RealLearn does not guarantee the
          accuracy, reliability, or completeness of any AI-generated content. The content is for
          educational purposes only and should not be considered professional advice. Always verify
          important information with qualified professionals or authoritative sources.
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
          any time using the &quot;Delete My Data&quot; feature. Sections that by their nature should
          survive termination shall survive, including but not limited to Sections 7, 9, 10, 11,
          and 12.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>9. Limitation of Liability</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          To the maximum extent permitted by applicable law, RealLearn, its owners, operators,
          contributors, and affiliates shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or any loss of profits, data, use, goodwill, or other
          intangible losses, arising out of or in connection with your use of or inability to use
          the Service, including but not limited to: (a) any errors or inaccuracies in AI-generated
          content; (b) any unauthorized access to or use of our servers or any personal data stored
          therein; (c) any interruption or cessation of the Service; (d) any bugs, viruses, or
          other harmful code transmitted through the Service; or (e) any conduct of any third party
          on the Service. Our total liability to you for any claim arising out of these Terms shall
          not exceed the greater of one hundred dollars ($100.00) or the amount you paid us in the
          twelve months prior to the event giving rise to the claim.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>10. Warranty Disclaimer</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT
          WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED
          TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          NON-INFRINGEMENT, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING, USAGE, OR TRADE
          PRACTICE. RealLearn does not warrant that: (a) the Service will be uninterrupted, timely,
          secure, or error-free; (b) the results obtained from the use of the Service will be
          accurate or reliable; (c) the quality of any content, information, or other material
          obtained through the Service will meet your expectations; or (d) any errors in the Service
          will be corrected.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>11. Indemnification</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          You agree to defend, indemnify, and hold harmless RealLearn, its owners, operators,
          contributors, and affiliates from and against any claims, liabilities, damages, losses,
          and expenses (including reasonable attorneys&apos; fees) arising out of or in any way
          connected with: (a) your access to or use of the Service; (b) your violation of these
          Terms; (c) your violation of any third-party right; or (d) any content you submit to the
          Service.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>12. Content Moderation and Guardrails</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We employ automated content filtering &mdash; both pattern-based filters and an AI safety
          classifier &mdash; on the questions you submit and on AI-generated responses, to ensure the
          Service remains safe and appropriate for all users. Blocked inputs and flagged responses
          are logged with a pseudonymous account identifier and may be reviewed by humans for
          moderation purposes. We also apply rate limits and input-size limits to protect the
          Service from abuse. We reserve the right to remove or restrict access to content that
          violates our community guidelines or these Terms. Repeated attempts to generate prohibited
          content may result in suspension or termination of your account.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>13. Governing Law</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          These Terms shall be governed by and construed in accordance with the laws of India,
          without regard to its conflict of law provisions. Any disputes arising from these Terms
          or your use of the Service shall be resolved in the courts located in India.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>14. DPDP Act Compliance (Indian Users)</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you are located in India, the Digital Personal Data Protection Act, 2023 (DPDP Act)
          governs the processing of your personal data. By using the Service, you consent to the
          processing of your personal data as described in our Privacy Policy. You have the right to
          access, correct, erase, and nominate another individual to exercise your rights. You may
          withdraw consent at any time by deleting your account. RealLearn (alakmar344) acts as the
          Data Fiduciary under the DPDP Act. Grievances will be addressed within 7 days. For
          complaints, you may contact us or approach the Data Protection Board of India.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>15. Dispute Resolution</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Before filing any formal legal action, you agree to first contact us at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>{" "}
          and attempt to resolve the dispute informally within 30 days. If the dispute cannot be
          resolved informally, either party may pursue resolution through the courts specified in
          Section 13. You agree that any dispute resolution proceedings will be conducted only on an
          individual basis and not in a class, consolidated, or representative action.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>16. Force Majeure</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn shall not be liable for any failure or delay in performance arising from causes
          beyond its reasonable control, including but not limited to: acts of God, natural
          disasters, pandemic, epidemic, war, terrorism, riots, embargoes, acts of government,
          fire, flood, strikes, power outages, internet or infrastructure failures, or third-party
          service provider outages.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>17. Severability</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If any provision of these Terms is held to be invalid, illegal, or unenforceable by a
          court of competent jurisdiction, such provision shall be modified to the minimum extent
          necessary to make it valid, legal, and enforceable while preserving the original intent
          of the provision. The invalidity or unenforceability of any provision shall not affect the
          validity or enforceability of the remaining provisions, which shall continue in full force
          and effect.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>18. Entire Agreement</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire
          agreement between you and RealLearn regarding the Service, and supersede all prior
          agreements, understandings, and representations, whether written or oral, regarding the
          Service.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>19. Changes to Terms</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We reserve the right to modify or replace these Terms at any time. If a revision is
          material, we will provide at least 30 days&apos; notice prior to any new terms taking effect,
          and will require re-acceptance through an in-app prompt. By continuing to access or use
          the Service after any revisions become effective, you agree to be bound by the updated
          terms.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>20. Contact Information</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          If you have any questions about these Terms of Service or our legal policies, please
          contact us at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>.
          You may also visit our website at{" "}
          <a href="https://reallearn.site" style={{ color: "var(--accent)" }}>
            reallearn.site
          </a>.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>21. Copyright and Trademark</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn, the RealLearn logo, and all related names, logos, and slogans are the
          intellectual property of alakmar344. All content generated by the Service is the property
          of the user who requested it, subject to our limited license to display it as part of the
          Service. Unauthorized use of our branding is prohibited.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>22. Data Retention and Deletion</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We retain your account and conversation data only as long as necessary to provide the
          service or comply with legal obligations. When you delete your account, we delete your
          data from our servers within 30 days. For more details, see our{" "}
          <a href="/legal?tab=privacy" style={{ color: "var(--accent)" }}>Privacy Policy</a>.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>23. Accessibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We strive to make our Service accessible to all users and aim to conform to WCAG 2.1
          Level AA standards. If you experience any accessibility issues, please contact us and
          we will make reasonable efforts to address them.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>24. Gamification &amp; Virtual Rewards</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          The Service offers engagement features including experience points (XP), levels, daily
          streaks, streak freezes, daily goals, and achievement badges (collectively,
          &quot;Virtual Rewards&quot;). Virtual Rewards are provided for motivational and entertainment
          purposes only. They have <strong>no monetary value</strong>, cannot be purchased,
          redeemed, transferred, or exchanged for cash or any other benefit, and confer no
          ownership rights. We may add, modify, reset, or discontinue any Virtual Reward or
          engagement feature at any time without notice or liability.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>25. Voice Features</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          The Service offers optional voice input (speech-to-text) and &quot;Listen&quot; read-aloud
          (text-to-speech) features. Voice input relies on your browser&apos;s built-in Web Speech
          API and is processed by your browser vendor&apos;s speech service. Listen is generated by
          our servers using Microsoft&apos;s Edge neural text-to-speech service. Voice features are
          provided &quot;as is&quot; &mdash; transcription and pronunciation errors are possible.
          We may modify or discontinue voice features at any time without liability.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          19. AI Safety and User Responsibility
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn includes automated safety filters, but no automated system is perfect. You agree
          not to rely on the Service for emergency, medical, legal, financial, or other high-risk
          decisions, and you are responsible for independently verifying critical information.
          You also agree not to bypass, probe, or abuse safety controls, rate limits, or account
          protections. Repeated attempts to evade safeguards may result in suspension or termination.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          20. Privacy Rights and Compliance
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Your privacy rights are described in our Privacy Policy, including rights available under
          applicable laws such as GDPR and U.S. state privacy laws. By using the Service, you
          acknowledge that we may process data as described there to provide the product, prevent
          abuse, and meet legal obligations. If law requires us to notify you of material compliance
          or policy changes, we will do so through in-app notice, email, or an updated legal notice.
        </p>
      </section>
    </article>
  );
}
