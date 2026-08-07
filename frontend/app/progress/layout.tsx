import type { Metadata } from "next";

// Auth-gated surface: robots.txt already disallows /progress/, and this
// belt-and-suspenders noindex keeps it out of the index even if a crawler
// reaches it via an off-site link. It also stops the route from inheriting
// the root layout's canonical "/".
export const metadata: Metadata = {
  title: "Your progress",
  description:
    "Streaks, XP, badges, and learning history on RealLearn.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function ProgressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
