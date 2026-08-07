// Shared body for the standalone /legal/privacy/ route and the /legal hub embed.
// Lives outside page.tsx because Next.js pages may not carry extra exports
// or custom props.

// `embedded` = rendered inside the /legal hub (which owns the page h1);
// the standalone route renders the title as the document h1 instead.
export function PrivacyPolicyContent({ embedded = false }: { embedded?: boolean }) {
  const Title = embedded ? ("h2" as const) : ("h1" as const);
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
      <Title
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        Privacy Policy
      </Title>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>
        Last updated: August 7, 2026 (version 3.1)
      </p>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Who We Are (Data Controller)</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn (&quot;RealLearn&quot;, &quot;we&quot;, &quot;us&quot;) is the data controller /
          data fiduciary responsible for the personal data described in this policy. For all privacy,
          data-protection, and grievance matters — including requests to exercise your rights under
          the GDPR, the California Consumer Privacy Act (as amended by the CPRA), or India&apos;s
          Digital Personal Data Protection Act, 2023 (DPDP Act) — you can reach our privacy contact
          and designated grievance officer at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>
          . We aim to acknowledge grievances promptly and respond within the timelines required by
          applicable law.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>1. What RealLearn Is</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn is an AI-powered educational platform. Depending on the answer mode you choose,
          it generates either a quick single-part direct answer (&quot;Fast&quot; mode) or a 3-part
          learning journey (Foundation, Mechanism, Real World — &quot;Explain&quot; mode) for any
          topic you ask about. It is powered by Google&apos;s Gemma 4 open model: our primary
          inference provider is <strong>Cerebras Cloud</strong> (running Gemma 4 31B), with{" "}
          <strong>NVIDIA NIM</strong> (Gemma 4 31B) configured as the automatic fallback and{" "}
          <strong>Cloudflare Workers AI</strong> (Gemma) as a last-resort fallback so lessons can
          still be generated if the primary and fallback are slow or unavailable. This is designed to
          help students learn through interactive quizzes and structured content.
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
            consent tracking, and rate limiting). Before an IP address is written to a stored
            consent record we <strong>anonymize it by truncation</strong> (the last part of the
            address is removed, e.g. 203.0.113.0), so stored records never contain your full IP
            address; the User-Agent is stored only as a salted one-way hash.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Consent Records:</strong> Timestamps of when you accepted our Privacy Policy
            (version 3.1), Terms of Service (version 2.8), and cookie/analytics consent, together
            with the policy version, an <strong>anonymized (truncated) device IP</strong>, and a
            hashed User-Agent, kept as proof of consent.
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
            <strong>Saved Lessons:</strong> Your learning journeys (chats) are stored locally on
            your device, split across two browser storage areas for performance: the full lesson
            content (lesson text and quizzes) of <strong>every</strong> journey is stored in your
            browser&apos;s <strong>IndexedDB</strong>, while a lightweight index (question, scores,
            dates, and part/quiz counts) is kept in localStorage. Both live only on your device
            and are <strong>never transmitted to or stored on our servers</strong>; re-opening a
            saved lesson loads it directly from your device.
          </li>
          <li>
            <strong>Optional Feedback (anonymous, not linked to you):</strong> Soon after you
            complete your <em>first</em> learning journey, RealLearn may invite you to leave an
            optional review: what you liked, what we should improve, and a 1–10 star rating. This
            feedback is <strong>completely anonymous</strong>. When you submit it, we store
            <strong> only</strong> the review text and rating — we deliberately strip and never
            include your IP address, Clerk ID, or email, and the request is sent with no account
            identity attached. The prompt is optional and never forced: you can skip it, ask to be
            reminded later, or dismiss it permanently. Once you have responded (or permanently
            declined), we record a single local flag in your browser so the prompt does not appear
            again — this &quot;given&quot; flag lives only in your device&apos;s localStorage and is
            never sent to our servers. You can clear it at any time with &quot;Delete My Data&quot;.
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
          <li style={{ marginBottom: 4 }}>
            <strong>Personalization &amp; Delight Data (stored locally):</strong> To make the app
            feel personal, we keep a small amount of information in your browser&apos;s
            localStorage only: (1) the date you first used RealLearn on this device, used to show a
            friendly &quot;learning together for N days&quot; counter; (2) simple once-per-day
            markers that record whether a seasonal or time-of-day greeting (a small
            &quot;surprise&quot; message) has already been shown today, so we never show it twice;
            and (3) optional learning preferences you can set after signing in — a checklist of
            learning-style choices (for example, simple language, step-by-step explanations, or visual
            analogies) plus free-text notes about how you learn best. These learning preferences are
            stored only on your device, can be changed or cleared anytime in Settings, and are{" "}
            <strong>not stored on our servers</strong>; they are simply included with each lesson-
            generation request so the AI can tailor its response. We cap the free-text notes at 500
            characters. If you are signed in, your first name (provided by Clerk) may be displayed in
            an on-screen greeting — this happens entirely in your browser. None of this information is{" "}
            <strong>transmitted to or stored on our servers</strong> (except the learning preferences,
            which are sent only with the lesson request and then discarded), and clearing your browser
            data or using &quot;Delete My Data&quot; removes it.
          </li>
          <li>
            <strong>Moderation Logs:</strong> When a question you submit or an AI response is
            blocked by our safety filters, we record a moderation log entry containing the reason
            the content was flagged, the question that triggered the flag (limited to the first 500
            characters), and a pseudonymous account identifier. These logs never contain your email,
            IP address, or other personal identifying information, and never contain internal error
            details. They are <strong>automatically and permanently deleted after 90 days</strong>{" "}
            by a database-level expiry rule, or immediately when you delete your account —
            whichever comes first.
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
          <li style={{ marginBottom: 4 }}>
            To show friendly, personalized touches — a time-of-day greeting (optionally using your
            first name, rendered only in your browser), a local counter of how many days you have
            used RealLearn, and small once-per-day seasonal surprises — all computed and stored
            locally on your device.
          </li>
          <li style={{ marginBottom: 4 }}>
            To tailor lesson generation using your optional, locally-stored learning preferences
            (learning-style checklist and free-text notes), which are sent with each lesson request
            and not retained on our servers.
          </li>
          <li style={{ marginBottom: 4 }}>To analyze usage patterns through Google Analytics and improve our service.</li>
          <li style={{ marginBottom: 4 }}>To comply with legal obligations and age-appropriate content rules.</li>
          <li style={{ marginBottom: 4 }}>To improve our educational content quality and service experience.</li>
          <li>To communicate important service updates (if you provide contact consent).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>4. Legal Bases for Processing (GDPR)</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          For users in the European Economic Area and other jurisdictions that require a specified
          legal basis, we process personal data only where we have a valid legal basis. The table
          below lists the main categories of processing and the basis that applies:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Performance of a contract / taking steps at your request:</strong> account
            creation and authentication, generating the lessons and read-aloud audio you request,
            and providing the core Service features tied to your account.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Consent:</strong> optional Google Analytics cookies and usage analytics,
            optional anonymous feedback, and optional learning personalization (learning-style
            checklist and free-text notes). You can withdraw consent anytime in Settings or through
            your browser&apos;s cookie controls.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Legitimate interests:</strong> keeping the Service secure, preventing abuse and
            fraud, rate limiting, transient IP and request-header processing by our hosting
            infrastructure (Vercel and Render) to deliver pages and API responses, pseudonymized
            moderation logging to enforce our content rules, anonymous lesson/audio caching for
            performance, and local gamification data stored on your device. We balance these
            interests against your privacy rights and keep data minimization in mind.
          </li>
          <li>
            <strong>Legal obligation:</strong> retaining proof of your acceptance of the Privacy
            Policy and Terms of Service, preserving records required by applicable law, responding
            to lawful requests from public authorities, and retaining moderation data where
            necessary to comply with legal or regulatory requirements.
          </li>
        </ul>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          Where we rely on consent, you have the right to withdraw it at any time. Withdrawing consent
          will not affect the lawfulness of processing carried out before the withdrawal.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>5. Data Storage and Security</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Your consent records are stored securely in MongoDB, keyed to your Clerk account ID
          (your email address is held by Clerk, our authentication provider). Your saved
          lessons, preferences, and all learning-progress and achievement data (XP, level, streaks,
          daily goals, activity history, and badges) are stored in your browser&apos;s local storage
          areas on your own device — full lesson content in IndexedDB, and the history index,
          preferences, and progress data in localStorage — and never leave it.
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          We apply a defense-in-depth approach to security. Measures that are in place include:
          Clerk-managed authentication with cryptographically verified JWT session tokens and
          rotating signing keys; encrypted network connections using HTTPS with HSTS; per-request
          Content-Security-Policy nonces and strict browser security headers (including
          X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Cross-Origin-Opener-Policy);
          request rate limiting backed by both per-user and per-IP ceilings with token-spray
          protection; strict input validation and size limits on every API endpoint; automated,
          rule-based content moderation on user inputs and AI outputs; IDOR-resistant data access
          keyed only to the verified Clerk identity; salted one-way hashing of device
          User-Agents; truncation of IP addresses before storage; API keys and secrets kept in
          environment variables rather than client code; and MongoDB Atlas managed hosting with
          encryption in transit and at rest. We also maintain an incident-response process to
          investigate, contain, and notify affected users and regulators of confirmed personal-data
          breaches as required by law. However, no method of electronic storage is 100% secure, and
          we cannot guarantee absolute security.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>6. AI-Generated Content</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn generates content using Google&apos;s Gemma 4 open AI model. Our primary
          inference provider is <strong>Cerebras Cloud</strong> (running Gemma 4 31B); if Cerebras is
          temporarily slow or unavailable, the request automatically falls back to{" "}
          <strong>NVIDIA NIM</strong> (Gemma 4 31B), and may then use{" "}
          <strong>Cloudflare Workers AI</strong> (Gemma) as a last-resort provider so your lesson can
          still be generated. All
          lesson content (in both Fast and Explain modes), quizzes,
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
          Your questions are sent to our primary inference provider, <strong>Cerebras Cloud</strong>{" "}
          (which runs the Gemma model), for one-time inference only. If Cerebras is temporarily slow
          or unavailable, the same request falls back to <strong>NVIDIA NIM</strong> (running Gemma),
          and may then use <strong>Cloudflare Workers AI</strong> as a last-resort fallback for
          one-time inference so the lesson can still be generated; the same &quot;no training on your
          data&quot; commitment applies to all three providers. Safety moderation
          of your question and the generated lesson is performed locally on our own servers using
          rule-based pattern matching — your question is <strong> not</strong> sent to any third
          party just for moderation. We do not store your questions or generated lessons in a form
          linked to your account. To improve speed, a generated lesson may be kept in a short-lived
          server-side cache keyed by a one-way hash of the question text (not by your identity) and
          is deleted automatically when it expires. However, please note that your questions are
          transmitted to these providers&apos; APIs, and their own terms may govern how they handle
          that data. We recommend reviewing{" "}
          <a href="https://www.nvidia.com/en-us/about-nvidia/privacy-policy/" style={{ color: "var(--accent)" }}>
            NVIDIA&apos;s Privacy Policy
          </a>{", "}
          <a href="https://www.cloudflare.com/privacypolicy/" style={{ color: "var(--accent)" }}>
            Cloudflare&apos;s Privacy Policy
          </a>{", and "}
          <a href="https://www.cerebras.ai/privacy" style={{ color: "var(--accent)" }}>
            Cerebras&apos;s Privacy Policy
          </a>{" "}
          for details on their data practices.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>7. Cookies and Local Storage</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We use browser localStorage to store your consent preferences, theme settings, your
          saved-lesson history index, your learning-progress and achievement data (XP, level,
          streaks, daily goals, activity history, and badges), and your personalization data (the
          date you first used RealLearn on this device, once-per-day markers for seasonal
          greetings, and optional learning-style preferences with free-text notes capped at 500
          characters), and browser <strong>IndexedDB</strong>{" "}
          to store the full content of your saved lessons (chats). We use Google Analytics cookies
          (loaded only after consent) for service improvement.
          We do not use tracking cookies for advertising. Clerk, our authentication provider,
          uses essential cookies for session management. For more details, please see our{" "}
          <a href="/legal?tab=cookies" style={{ color: "var(--accent)" }}>Cookie Policy</a>.
          You can clear your localStorage and IndexedDB at any time through your browser settings
          or by using the &quot;Delete My Data&quot; feature in the app, which clears both.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>8. Your Rights and Choices</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          Depending on where you live, you may have the following rights regarding your personal data:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Access:</strong> You can request a copy of the personal data we hold about you
            using the &quot;Export My Data&quot; feature.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Correction / Rectification:</strong> You can update your email through your Clerk
            account settings and correct locally-stored preferences directly in Settings.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Erasure (&quot;right to be forgotten&quot;):</strong> You can delete your account
            and all associated data using the &quot;Delete My Data&quot; feature. This removes your
            MongoDB records, Clerk account, and all local data.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Objection / Restriction:</strong> You may object to certain processing based on
            legitimate interests or ask us to restrict processing in specific circumstances.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Data portability:</strong> You can receive your data in a structured, commonly
            used format through the export tool.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Withdraw consent:</strong> Where we rely on consent, you can withdraw it at any
            time from Settings → Privacy or through your browser&apos;s cookie controls. Previously
            collected data may remain until deletion.
          </li>
          <li>
            <strong>Lodge a complaint:</strong> You have the right to complain to a data-protection
            supervisory authority in your country or region.
          </li>
        </ul>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
          To exercise any of these rights, use the in-product tools or contact us at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>
          . We will verify your identity through your authenticated account before acting on your
          request.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>9. Third-Party Services</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We use the following third-party services:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Clerk</strong> (clerk.com) — Authentication and user management.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Cerebras Cloud</strong> (cerebras.ai) — Our <strong>primary</strong> AI content
            generation provider. Your question, chosen language, and difficulty level are sent to
            Cerebras&apos; API (which runs Google&apos;s Gemma 4 31B open model) for one-time
            inference (lesson generation only — safety moderation runs locally on our servers and is
            not sent to Cerebras). No user identity is included in the API call. Cerebras&apos; own
            data practices apply to API requests.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>NVIDIA NIM</strong> (nvidia.com) — Our <strong>automatic fallback</strong> AI
            provider. Used when Cerebras is temporarily slow or unavailable. NVIDIA receives the
            same question, language, and difficulty level for one-time inference with no user
            identity attached, and no user data is used for training.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Cloudflare Workers AI</strong> (cloudflare.com) — Our <strong>last-resort</strong>
            AI provider. Used only when the primary and NVIDIA fallback paths are temporarily slow
            or unavailable, so lessons can still be generated. It runs Google&apos;s Gemma open model
            hosted on Cloudflare&apos;s network. When invoked, the same question, language, and
            difficulty level are sent for one-time inference with no user identity attached, and no
            user data is used for training.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>MongoDB Atlas</strong> (mongodb.com) — Managed database hosting. Stores your
            consent records (keyed to your Clerk account ID — your email address is held by Clerk,
            not in our database), moderation logs, and anonymous feedback as described in Section
            5, encrypted in transit and at rest. MongoDB acts as our storage processor and does not
            use your data for its own purposes.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Vercel</strong> (vercel.com) — Hosts and serves the RealLearn web application.
            As the delivery infrastructure, Vercel transiently processes network request data (such
            as your IP address and request headers) to serve pages and protect against abuse. It
            does not receive your questions&apos; lesson content or your consent records.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Render</strong> (render.com) — Hosts our backend API. Requests you make to
            generate lessons, save consent, or use read-aloud pass through Render&apos;s
            infrastructure, which transiently processes network request data (such as your IP
            address) to route and serve those requests. Our own application code truncates IPs
            before anything is stored (see Section 2).
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
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>10. Data Retention</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          We keep personal data only as long as needed for the purpose it was collected:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: "0 0 8px" }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Account &amp; consent records</strong> (Clerk ID, consent timestamps,
            anonymized/truncated IP, hashed User-Agent; your email address is held by our
            authentication provider Clerk, not stored in our own database) — for as long as your
            account is active,
            and deleted from our servers within 30 days of account deletion. Full IP addresses are
            never retained: they are truncated before storage, and records created before policy
            version 2.3 have been retroactively anonymized the same way.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Moderation logs</strong> (pseudonymous account identifier, the reason a
            question or response was flagged, and the flagged question itself, capped at 500
            characters) — retained for abuse prevention for a <strong>maximum of 90 days</strong>,
            after which they are deleted automatically by a database-level expiry (TTL) rule.
            They are deleted earlier if you delete your account. Unlinked/aggregate safety
            metrics may be retained longer.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Cached lessons and read-aloud audio</strong> (not linked to your identity) —
            expire automatically, typically within a few hours (lessons) or up to 24 hours (audio).
          </li>
          <li>
            <strong>Locally-stored data</strong> (saved lessons in IndexedDB; history index,
            preferences, learning progress, and optional learning personalization in localStorage) —
            remains on your device until you clear it or use &quot;Delete My Data&quot;, which removes
            both storage areas.
          </li>
        </ul>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We may retain limited data beyond these periods only where required by law or for the
          establishment, exercise, or defense of legal claims.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>11. International Transfers</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          RealLearn relies on global service providers (including Clerk, Cloudflare, Microsoft,
          Google, MongoDB Atlas, Serper, Vercel, and Render), so your data may be processed in countries other than
          your own, including the United States. Where personal data is transferred out of the
          EEA, UK, or other regions with transfer restrictions, we rely on lawful transfer
          mechanisms — such as the European Commission&apos;s Standard Contractual Clauses (and the
          UK Addendum), adequacy decisions where available, and the safeguards our processors
          themselves maintain. You may contact us to ask about the safeguards applicable to a
          specific transfer.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
         <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>12. Changes to This Policy</h3>
         <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
           We may update this Privacy Policy from time to time. We will notify you of any changes
           by posting the new policy on this page and updating the &quot;Last updated&quot; date.
           Continued use of the service after changes constitutes acceptance of the updated policy.
         </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
            <strong>Version 3.1 (effective August 7, 2026).</strong> This update expands our
            children&apos;s privacy disclosures and parental controls, adds an explicit GDPR legal
            bases section, expands the DPDP Act rights list, strengthens the security section with
            specific technical and organizational measures, and adds a dedicated grievance-officer
            contact. Because these are material legal changes, we are re-prompting all users to
            review and re-accept this Privacy Policy and the updated Terms of Service before
            continuing.
          </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
            <strong>Version 3.0 (effective August 7, 2026).</strong> This update discloses our
            hosting infrastructure providers — <strong>Vercel</strong> (serves the web app) and{" "}
            <strong>Render</strong> (hosts our backend API) — which transiently process network
            request data such as IP addresses to deliver the service. It also corrects where your
            email address lives (it is held by our authentication provider Clerk; our own database
            keys consent records to your account ID and stores no email), and reflects a
            data-minimization improvement: the app no longer transmits your email address with
            consent submissions. Because this changes our processor disclosures, we are
            re-prompting all users to review and re-accept this Privacy Policy.
          </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
            <strong>Version 2.9 (effective August 5, 2026).</strong> This update adds
            <strong> NVIDIA NIM</strong> as the automatic AI fallback after Cerebras and moves
            <strong> Cloudflare Workers AI</strong> to a last-resort provider role. Because this is a
            material provider-routing disclosure change, we are re-prompting all users to review and
            re-accept this Privacy Policy and the updated Terms before continuing.
          </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
            <strong>Version 2.7 (effective July 22, 2026).</strong> This update discloses the new
            optional <strong>learning personalization</strong> feature: signed-in users can choose
            learning-style preferences (for example, simple language, step-by-step explanations, or
            visual analogies) and add free-text notes about how they learn best. These preferences
            are stored only in your browser&apos;s localStorage and are included with each lesson-
            generation request so the AI can tailor its response; they are <strong>not stored on our
            servers</strong>. You can change or clear them anytime in Settings, and &quot;Delete My
            Data&quot; removes them. The free-text notes are capped at 500 characters. Because this
            changes our local-storage and data-processing disclosures, we are re-prompting all users
            to review and re-accept this Privacy Policy before continuing.
          </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
            <strong>Version 2.6 (effective July 17, 2026).</strong> This update discloses the new
            optional, anonymous <strong>feedback</strong> feature: soon after a user completes
            their first learning journey, RealLearn may invite an optional 1–10 star rating plus
            free-text notes on what they liked and what to improve. The review is submitted with no
            account identity and we store only the rating and review text — never the IP address,
            Clerk ID, or email. The prompt is optional, never forced, and is suppressed once the
            user responds (or declines) via a local-only flag in localStorage. No new third parties
            and no change to analytics. We are surfacing this disclosure for transparency; the
            change does not re-prompt consent because no new server-side personal data is collected.
          </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
            <strong>Version 2.5 (effective July 15, 2026).</strong> This update discloses new{" "}
           <strong>locally-stored personalization data</strong> introduced with our friendlier
           experience: the date you first used RealLearn on this device (shown as a
           &quot;learning together for N days&quot; counter), once-per-day markers that prevent a
           seasonal or time-of-day greeting from being shown twice in one day, and the on-device
           display of your first name (from your Clerk account) in a greeting. All of this lives
           only in your browser&apos;s localStorage, is <strong>never transmitted to or stored on
           our servers</strong>, and is removed by clearing your browser data or using
           &quot;Delete My Data&quot;. No new server-side collection, no new third parties, and no
           change to analytics. Because this changes our local-storage disclosures, we are
           re-prompting all users to review and re-accept this Privacy Policy before continuing.
         </p>
         <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
           <strong>Version 2.4 (effective July 14, 2026).</strong> This update changes where your
           saved lessons live on your device: the full content of <strong>every</strong> saved
           lesson (chat) is now stored in your browser&apos;s <strong>IndexedDB</strong> instead of
           localStorage, with only a lightweight history index (question, scores, dates) remaining
           in localStorage. All data still stays on your device only and is never sent to our
           servers; re-opening a saved lesson loads it locally instead of regenerating it. The
           &quot;Delete My Data&quot; feature clears both storage areas. Because this changes our
           local-storage disclosures, we are re-prompting all users to review and re-accept this
           Privacy Policy (and the updated Terms of Service) before continuing.
         </p>
         <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
           <strong>Version 2.3 (effective July 14, 2026).</strong> This update strengthens data
           minimization: (1) <strong>IP anonymization</strong> — consent records now store only a
           truncated network prefix (e.g. 203.0.113.0) instead of your full IP address, and all
           previously stored full IPs have been retroactively anonymized in the same way; and
           (2) <strong>tiered local lesson-history retention</strong> — your most recent journeys
           are kept in full on your device while older ones are condensed to lightweight summaries
           instead of being deleted. Because this changes our data-processing disclosures, we are
           re-prompting all users to review and re-accept this Privacy Policy before continuing.
         </p>
         <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
           <strong>Version 2.2 (effective July 13, 2026).</strong> This update clarifies our AI
           inference providers: our <strong>primary</strong> model provider is now{" "}
           <strong>Cerebras Cloud</strong> (running Google&apos;s Gemma 4 31B), with{" "}
           <strong>Cloudflare Workers AI</strong> (Gemma) as an automatic fallback, and updates the
           Third-Party Services disclosures accordingly. Because this is a material change to our
           data-processing disclosures, we are re-prompting all users to review and re-accept this
           Privacy Policy (and our Terms of Service) before continuing. If you do not re-accept, you
           can still browse, but lesson generation and account features that require current consent
           will be paused until you do.
         </p>
       </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>13. Contact Us</h3>
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

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>14. Accessibility</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We are committed to making our Service accessible to all users. We aim to conform to
          WCAG 2.1 Level AA standards. If you encounter any accessibility barriers, please
          contact us and we will work to address them.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
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

      <section style={{ marginBottom: 28 }}>
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

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          17. Automated Content Generation &amp; Moderation
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Lessons are produced by an automated AI system, and both your inputs and the generated
          outputs pass through automated, rule-based (pattern-matching) safety filters that run on
          our own servers — not a third-party AI classifier — before or shortly after content is
          shown. These processes are used solely to generate educational content and to keep the
          Service safe — they do not make legal, financial, or similarly significant decisions about
          you, and no automated profiling is used for advertising. Because the filters are automated
          and rule-based, they are imperfect and may occasionally over- or under-block; you remain
          responsible for verifying AI-generated information (see Section 6).
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
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

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          19. Children&apos;s Privacy
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          RealLearn is intended for learners aged <strong>13 and older</strong>. We do not knowingly
          create accounts for, or collect personal data from, children under 13. If your
          jurisdiction sets a higher minimum digital-consent age (for example, 16 in parts of the
          EEA, or 18 under India&apos;s DPDP Act for certain processing without verifiable parental
          consent), the same age-gating and parental-involvement requirements apply.
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: "0 0 8px" }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Age gating:</strong> During onboarding we ask for your date of birth and do not
            allow account creation for users who tell us they are under 13. We store only an age
            bracket (under 13, 13–17, or 18+), never your exact date of birth.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Parental approval for minors:</strong> If you are 13–17, you must check a box
            confirming that a parent or legal guardian has reviewed and approved your use of
            RealLearn. This is a self-attested confirmation; we do not currently require
            independent identity verification of the parent or guardian.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>What data we collect from minors:</strong> We collect the same limited categories
            described in Section 2. We do not knowingly collect precise geolocation, government
            identifiers, or other sensitive personal data from children beyond what is necessary to
            provide the Service.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>No ads or behavioral tracking:</strong> We do not serve targeted advertising to
            children and do not sell or &quot;share&quot; children&apos;s personal information for
            behavioral advertising. Analytics cookies are loaded only with consent.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Parent/guardian controls:</strong> A parent or legal guardian may review the
            personal data we hold about a minor, revoke consent, request correction or deletion of
            the minor&apos;s account and data, or raise any concern by contacting us at{" "}
            <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
              esamzai365@gmail.com
            </a>
            . We will respond promptly and take reasonable steps to verify the requestor&apos;s
            relationship to the child before acting.
          </li>
          <li>
            <strong>If a child under 13 signs up:</strong> If we learn that we have collected
            personal data from a child under 13 without appropriate parental consent, we will delete
            that data promptly. Parents or guardians who believe a child has provided us personal
            data without proper consent may contact us at the email above.
          </li>
        </ul>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          This section supports our obligations under laws such as the U.S. Children&apos;s Online
          Privacy Protection Act (COPPA), the GDPR provisions on children&apos;s data, and the
          parental-consent requirements of India&apos;s DPDP Act.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          20. Your California Privacy Rights (CCPA/CPRA)
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          If you are a California resident, you have the right to know what personal information we
          collect, to access and delete it, to correct inaccuracies, and to limit the use of
          sensitive personal information — and the right not to be discriminated against for
          exercising these rights. The categories of personal information we collect are described
          in Section 2 (identifiers such as email and Clerk ID; internet/device information such as
          an anonymized/truncated IP and hashed User-Agent; and usage/education information such as
          questions, scores, and preferences), collected for the purposes in Section 3.
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          <strong>We do not sell your personal information, and we do not &quot;share&quot; it for
          cross-context behavioral advertising</strong>, as those terms are defined under the CPRA.
          We use Google Analytics only with your consent and with IP anonymization enabled. Because
          we do not sell or share personal information, there is nothing to opt out of in that
          sense; you can nonetheless withdraw analytics consent at any time from Settings →
          Privacy, and we honor browser-based opt-out signals such as the Global Privacy Control
          (GPC) as a valid request to not sell or share.
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          You (or an authorized agent) may exercise these rights using the in-product
          &quot;Export My Data&quot; and &quot;Delete My Data&quot; tools or by contacting us; we
          will verify requests through your authenticated account.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          21. India — Digital Personal Data Protection Act, 2023
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          If you are in India, we process your personal data as a Data Fiduciary on the basis of
          your consent and for the legitimate uses permitted under the DPDP Act. The DPDP Act grants
          you the following rights:
        </p>
        <ul style={{ fontSize: 14, color: "var(--text-secondary)", paddingLeft: 20, margin: "0 0 8px" }}>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to access:</strong> obtain confirmation and a copy of the personal data we
            process about you.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to correction:</strong> request correction of inaccurate or misleading
            personal data.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to erasure:</strong> request deletion of your personal data, subject to
            applicable exceptions.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to grievance redressal:</strong> raise a complaint with our grievance
            officer if you are unhappy with how we handle your data.
          </li>
          <li style={{ marginBottom: 4 }}>
            <strong>Right to nominate:</strong> nominate another person to exercise your rights in
            the event of your death or incapacity.
          </li>
          <li>
            <strong>Right to withdraw consent:</strong> withdraw your consent at any time, with the
            ease of doing so being comparable to the ease of giving consent.
          </li>
        </ul>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          <strong>Grievance Officer:</strong> you may raise any grievance regarding the processing
          of your personal data by writing to our grievance officer at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>
          . If your concern is not resolved, you may escalate it to the Data Protection Board of
          India. The DPDP Act requires parental consent for users below 18: RealLearn requires
          users aged 13&ndash;17 to confirm during onboarding that a parent or lawful guardian has
          reviewed and approved their use of the service (see Section 19), and we do not undertake
          tracking, behavioral monitoring, or targeted advertising directed at children.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          22. Grievance Officer
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          For users in India and any other jurisdiction that requires a designated grievance officer,
          our grievance officer is the privacy contact listed in Section 13. You may contact the
          grievance officer at{" "}
          <a href="mailto:esamzai365@gmail.com" style={{ color: "var(--accent)" }}>
            esamzai365@gmail.com
          </a>
          . We will acknowledge your grievance promptly and use reasonable efforts to resolve it
          within the timeframes required by applicable law. If you are not satisfied with our
          response, you have the right to escalate the matter to the relevant data-protection
          regulator or supervisory authority.
        </p>
      </section>
    </article>
  );
}
