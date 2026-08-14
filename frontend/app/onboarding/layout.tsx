import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started — RealLearn",
  description:
    "Set up RealLearn in about two minutes: a quick hello, the basics, your account, and a few picks so lessons fit you from day one.",
  robots: { index: false },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
