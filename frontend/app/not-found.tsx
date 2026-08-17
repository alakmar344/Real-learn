import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/shared/icons";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <main className="page-column page-column--center">
      <div className="animate-fade-up not-found-canvas">
        <p aria-hidden="true" className="not-found__code">404</p>
        <h1 className="not-found__title heading-rule heading-rule--center">
          This page isn&apos;t in the syllabus
        </h1>
        <p className="not-found__sub">
          The address may have moved or never existed. Pick up where you left
          off instead.
        </p>
        <div className="not-found__links">
          <Link href="/" className="btn-primary not-found__cta">
            <Icon name="sparkle" size={16} aria-hidden="true" />
            Ask a question
          </Link>
          <Link href="/learn" className="btn-ghost">
            Back to your lesson
          </Link>
          <Link href="/progress" className="btn-ghost">
            See your progress
          </Link>
        </div>
      </div>
    </main>
  );
}
