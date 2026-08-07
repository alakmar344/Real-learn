import { PrivacyPolicyContent } from "../legal/privacy/content";
import { TermsOfServiceContent } from "../legal/terms/content";
import { CookiePolicyContent } from "../legal/cookies/content";
import { Suspense } from "react";
import { Metadata } from "next";

type SearchParams = Promise<{ tab?: string }>;

export const metadata: Metadata = {
  title: "Legal — Privacy, Terms, and Cookie Policy",
  description:
    "Read RealLearn's privacy policy, terms of service, and cookie policy.",
  // Override the root layout's inherited canonical "/" — without this Google
  // treats the legal hub as a duplicate of the homepage.
  alternates: {
    canonical: "/legal/",
  },
};

export default async function LegalPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = params.tab || "privacy";

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "var(--text-primary)",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 32,
            marginBottom: 8,
          }}
        >
          Legal
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 14 }}>
          Please review our policies before using RealLearn.
        </p>

        <nav
          aria-label="Legal documents"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 32,
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: 0,
            flexWrap: "wrap",
          }}
        >
          <a
            id="legal-tab-privacy"
            href="/legal?tab=privacy"
            aria-current={tab === "privacy" ? "page" : undefined}
            style={{
              padding: "12px 20px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
              borderBottom: tab === "privacy" ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === "privacy" ? "var(--accent)" : "var(--text-secondary)",
              marginBottom: -1,
            }}
          >
            Privacy Policy
          </a>
          <a
            id="legal-tab-terms"
            href="/legal?tab=terms"
            aria-current={tab === "terms" ? "page" : undefined}
            style={{
              padding: "12px 20px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
              borderBottom: tab === "terms" ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === "terms" ? "var(--accent)" : "var(--text-secondary)",
              marginBottom: -1,
            }}
          >
            Terms of Service
          </a>
          <a
            id="legal-tab-cookies"
            href="/legal?tab=cookies"
            aria-current={tab === "cookies" ? "page" : undefined}
            style={{
              padding: "12px 20px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
              borderBottom: tab === "cookies" ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === "cookies" ? "var(--accent)" : "var(--text-secondary)",
              marginBottom: -1,
            }}
          >
            Cookie Policy
          </a>
        </nav>

        <Suspense fallback={<p style={{ color: "var(--text-secondary)" }}>Loading...</p>}>
          <div
            id={`legal-panel-${tab}`}
            aria-label={tab === "cookies" ? "Cookie Policy" : tab === "terms" ? "Terms of Service" : "Privacy Policy"}
          >
            {tab === "cookies" ? (
              <CookiePolicyContent embedded />
            ) : tab === "terms" ? (
              <TermsOfServiceContent embedded />
            ) : (
              <PrivacyPolicyContent embedded />
            )}
          </div>
        </Suspense>
      </div>
    </main>
  );
}
