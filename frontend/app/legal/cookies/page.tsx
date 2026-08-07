import type { Metadata } from "next";

// This component doubles as the /legal/cookies/ route and as an embed inside
// /legal — the metadata export only applies to the standalone route. The
// canonical override stops it inheriting the root layout's canonical "/".
export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Which cookies and local storage RealLearn uses, why, and how you control them.",
  alternates: {
    canonical: "/legal/cookies/",
  },
};

import { CookiePolicyContent } from "./content";

export default function CookiePolicy() {
  return <CookiePolicyContent />;
}
