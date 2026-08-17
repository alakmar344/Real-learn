import { PrivacyPolicyContent } from "../legal/privacy/content";
import { TermsOfServiceContent } from "../legal/terms/content";
import { CookiePolicyContent } from "../legal/cookies/content";
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";

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

const TABS = [
  { id: "privacy", label: "Privacy Policy" },
  { id: "terms", label: "Terms of Service" },
  { id: "cookies", label: "Cookie Policy" },
] as const;

export default async function LegalPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = params.tab === "terms" || params.tab === "cookies" ? params.tab : "privacy";
  const activeLabel = TABS.find((t) => t.id === tab)!.label;

  return (
    <main className="flow-page">
      <Navbar />
      <div className="flow-page__inner flow-page__inner--narrow">
        <header className="page-hero">
          <h1 className="page-hero__title">Legal</h1>
          <p className="page-hero__sub">Please review our policies before using RealLearn.</p>
        </header>

        <nav aria-label="Legal documents" className="legal-tabs">
          {TABS.map((t) => (
            <Link
              key={t.id}
              id={`legal-tab-${t.id}`}
              href={`/legal?tab=${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={`legal-tab${tab === t.id ? " legal-tab--active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <Suspense fallback={<p className="settings-sub">Loading policy…</p>}>
          <div id={`legal-panel-${tab}`} aria-label={activeLabel}>
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
