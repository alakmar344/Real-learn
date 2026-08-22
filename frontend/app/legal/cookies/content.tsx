// Shared body for the standalone /legal/cookies/ route and the /legal hub embed.
// Lives outside page.tsx because Next.js pages may not carry extra exports
// or custom props.

// `embedded` = rendered inside the /legal hub (which owns the page h1);
// the standalone route renders the title as the document h1 instead.
export function CookiePolicyContent({ embedded = false }: { embedded?: boolean }) {
  const Title = embedded ? ("h2" as const) : ("h1" as const);
  const Heading = embedded ? ("h3" as const) : ("h2" as const);
  return (
    <article className="legal-doc">
      <Title className="legal-doc__title">
        Cookie Policy
      </Title>
      <p className="legal-doc__meta">
        Last updated: July 22, 2026 (version 2.3)
      </p>

      <section className="legal-doc__section">
        <Heading className="legal-doc__heading">1. What Are Cookies</Heading>
        <p className="legal-doc__body">
          Cookies are small text files stored on your device by your browser. They help websites
          remember your preferences and improve your experience. RealLearn uses minimal cookies
          and primarily relies on browser storage (localStorage and IndexedDB) for data
          persistence.
        </p>
      </section>

      <section className="legal-doc__section">
        <Heading className="legal-doc__heading">2. How We Use Cookies</Heading>
        <p className="legal-doc__body">
          RealLearn uses the following:
        </p>
        <ul className="legal-doc__list">
          <li>
            <strong>Authentication (Clerk):</strong> Clerk, our authentication provider, uses
            cookies and similar technologies to manage your session and keep you signed in.
            These are necessary for the Service to function.
          </li>
          <li>
            <strong>Analytics (Google Analytics):</strong> We use Google Analytics to understand
            how users interact with our service and improve the learning experience. This is loaded
            only after you give cookie consent and helps us track usage patterns and performance.
          </li>
          <li>
            <strong>Local Storage:</strong> We use browser localStorage (not cookies) to store
            your consent preferences, theme settings, saved-lesson history index, your
            learning-progress and achievement data (experience points, level, daily streaks, daily
            goals, activity history, and badges), and your personalization data (the date you
            first used RealLearn on this device — shown as a &quot;learning together for N
            days&quot; counter — once-per-day markers that stop a seasonal or time-of-day greeting
            from appearing twice in one day, and optional learning-style preferences with free-text
            notes capped at 500 characters). Your learning preferences are sent with each lesson-
            generation request and then discarded; everything else in localStorage stays on your
            device and is not sent to our servers. We also use browser IndexedDB (not cookies) to
            store the full content of your saved lessons.
          </li>
          <li>
            <strong>Essential Cookies:</strong> We may use strictly necessary cookies for security
            and session management.
          </li>
        </ul>
      </section>

      <section className="legal-doc__section">
        <Heading className="legal-doc__heading">3. Third-Party Cookies</Heading>
        <p className="legal-doc__body">
          Our authentication provider Clerk may set cookies on your device. Please review
          Clerk&apos;s privacy policy for details on how they use cookies. We use Google Analytics,
          a web analytics service provided by Google, which sets cookies to analyze how visitors
          use our service. You can review Google&apos;s Privacy Policy at{" "}
          <a href="https://policies.google.com/privacy">
            policies.google.com/privacy
          </a>. We do not use advertising or tracking cookies for marketing purposes.
        </p>
      </section>

      <section className="legal-doc__section">
        <Heading className="legal-doc__heading">4. Managing Cookies</Heading>
        <p className="legal-doc__body">
          You can control and delete cookies through your browser settings. Disabling cookies may
          affect your ability to use certain features of the Service, including staying signed in.
          You can clear your localStorage and IndexedDB at any time using the &quot;Delete My
          Data&quot; feature in the app, which clears both.
        </p>
      </section>

      <section className="legal-doc__section">
        <Heading className="legal-doc__heading">5. Updates to This Policy</Heading>
        <p className="legal-doc__body">
          We may update this Cookie Policy from time to time. We will notify you of any changes
          by posting the new policy on this page and updating the &quot;Last updated&quot; date.
        </p>
        <p className="legal-doc__body">
          <strong>Version 2.3 (effective July 22, 2026).</strong> Updated the Local Storage
          disclosure to cover the new optional learning personalization data: learning-style
          checklist choices and free-text notes (capped at 500 characters) stored in your browser.
          These preferences are sent with each lesson-generation request and are not stored on our
          servers. Because the disclosure changed, the consent banner will ask for your choice again.
        </p>
        <p className="legal-doc__body">
          <strong>Version 2.2 (effective July 15, 2026).</strong> Updated the Local Storage
          disclosure to cover new locally-stored personalization data: the date you first used
          RealLearn on this device and once-per-day markers for seasonal greetings. This data
          never leaves your device. Because the disclosure changed, the consent banner will ask
          for your choice again.
        </p>
      </section>

      <section className="legal-doc__section">
        <Heading className="legal-doc__heading">6. Contact Us</Heading>
        <p className="legal-doc__body">
          If you have questions about our use of cookies, please contact us at{" "}
          <a href="mailto:esamzai365@gmail.com">
            esamzai365@gmail.com
          </a>.
        </p>
      </section>
    </article>
  );
}
