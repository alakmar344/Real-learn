import type { Metadata } from "next";

// Auth-gated surface: robots.txt already disallows /learn/, and this belt-and-
// suspenders noindex keeps it out of the index even if a crawler reaches it
// via an off-site link. It also stops the route from inheriting the root
// layout's canonical "/".
export const metadata: Metadata = {
  title: "Learn",
  description:
    "Your live RealLearn lesson — a clear, plain-language explanation in short parts.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
