import type { Metadata } from "next";

// The sign-up page itself is a client component and cannot export metadata —
// this layout carries its SEO surface. The canonical override matters: without
// it this route inherits the root layout's canonical "/" and Google would
// fold it into the homepage as a duplicate.
export const metadata: Metadata = {
  title: "Create your free account",
  description:
    "Join RealLearn free — ask any question and get a personalized 3-part AI lesson in 12 languages, with quiz-gated progress, streaks, and achievements.",
  alternates: {
    canonical: "/sign-up/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
