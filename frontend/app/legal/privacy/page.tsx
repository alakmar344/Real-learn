import type { Metadata } from "next";

// This component doubles as the /legal/privacy/ route and as an embed inside
// /legal — the metadata export only applies to the standalone route. The
// canonical override stops it inheriting the root layout's canonical "/".
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How RealLearn collects, uses, and protects your data — consent, retention, data export, and permanent deletion, explained in plain language.",
  alternates: {
    canonical: "/legal/privacy/",
  },
};

import { PrivacyPolicyContent } from "./content";

export default function PrivacyPolicy() {
  return <PrivacyPolicyContent />;
}
