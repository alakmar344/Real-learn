import PrivacyPolicy from "../legal/privacy/page";
import TermsOfService from "../legal/terms/page";
import CookiePolicy from "../legal/cookies/page";
import { Suspense } from "react";

type SearchParams = Promise<{ tab?: string }>;

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
            fontFamily: "var(--font-playfair)",
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

        <div
          role="tablist"
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
            href="/legal?tab=privacy"
            role="tab"
            aria-selected={tab === "privacy"}
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
            href="/legal?tab=terms"
            role="tab"
            aria-selected={tab === "terms"}
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
            href="/legal?tab=cookies"
            role="tab"
            aria-selected={tab === "cookies"}
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
        </div>

        <Suspense fallback={<p style={{ color: "var(--text-secondary)" }}>Loading...</p>}>
          {tab === "cookies" ? <CookiePolicy /> : tab === "terms" ? <TermsOfService /> : <PrivacyPolicy />}
        </Suspense>
      </div>
    </main>
  );
}
