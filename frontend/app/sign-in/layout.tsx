import type { Metadata } from "next";

// The sign-in page itself is a client component and cannot export metadata —
// this layout carries its SEO surface. The canonical override matters: without
// it this route inherits the root layout's canonical "/" and Google would
// fold it into the homepage as a duplicate.
export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to RealLearn — the AI learning platform that turns any question into a structured 3-part lesson with quizzes, streaks, and achievements.",
  alternates: {
    canonical: "/sign-in/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
