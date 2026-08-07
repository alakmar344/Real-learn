import type { Metadata } from "next";

// Auth-gated surface: robots.txt already disallows /settings/, and this
// belt-and-suspenders noindex keeps it out of the index even if a crawler
// reaches it via an off-site link. It also stops the route from inheriting
// the root layout's canonical "/".
export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your RealLearn account, preferences, and data.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
