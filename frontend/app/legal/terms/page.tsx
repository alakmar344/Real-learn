import type { Metadata } from "next";

// This component doubles as the /legal/terms/ route and as an embed inside
// /legal — the metadata export only applies to the standalone route. The
// canonical override stops it inheriting the root layout's canonical "/".
export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of RealLearn — accounts, acceptable use, AI-generated content, and your rights.",
  alternates: {
    canonical: "/legal/terms/",
  },
};

import { TermsOfServiceContent } from "./content";

export default function TermsOfService() {
  return <TermsOfServiceContent />;
}
