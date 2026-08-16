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
        <h1 className="not-found__title">Lost in space?</h1>
        <p className="not-found__sub">
          The page you are looking for does not exist or has been shifted in the cosmos.
        </p>
        <Link href="/" className="btn-primary not-found__cta">
          <Icon name="arrow-left" size={16} aria-hidden="true" />
          Return to RealLearn
        </Link>
      </div>
    </main>
  );
}
