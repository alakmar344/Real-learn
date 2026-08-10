import type { Metadata } from "next";

// Auth-gated surface: /find renders a learner's private, quiz-verified mastery
// map, so robots.txt disallows /find/ and this belt-and-suspenders noindex keeps
// it out of the index even if a crawler reaches it via an off-site link. It also
// stops the route from inheriting the root layout's canonical "/".
export const metadata: Metadata = {
  title: "Find your next lesson",
  description:
    "RealLearn Find maps everything you've proven you know and recommends the best next thing to learn — personalized to your quiz-verified mastery.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

export default function FindLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
