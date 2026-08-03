"use client";

/**
 * DeferredProviders — a Client Component wrapper that lazy-mounts the
 * non-critical, client-only UI providers (toast, easter eggs, analytics,
 * consent banners) AFTER hydration. By living behind a `"use client"`
 * boundary, the `dynamic(... { ssr: false })` calls are valid (Next.js
 * forbids `ssr: false` inside Server Components), and each provider's
 * JavaScript is split into its own chunk that the browser only fetches
 * once the main bundle has hydrated and the page is interactive.
 *
 * Components included here share these traits:
 *  - They are never visible on first paint.
 *  - They self-initialise via useEffect / global setters when they mount.
 *  - They don't need server-rendered HTML.
 *
 * Keeping them in the root layout (but deferred) means they're available
 * on every route without bloating the initial bundle.
 */
import dynamic from "next/dynamic";

const ToastContainer = dynamic(
  () => import("@/components/shared/ToastContainer"),
  { ssr: false, loading: () => null }
);
const EasterEggs = dynamic(
  () => import("@/components/shared/EasterEggs"),
  { ssr: false, loading: () => null }
);
const GoogleAnalytics = dynamic(
  () => import("@/components/shared/GoogleAnalytics"),
  { ssr: false, loading: () => null }
);
const CookieConsent = dynamic(
  () => import("@/components/shared/CookieConsent"),
  { ssr: false, loading: () => null }
);
const PreSignInConsent = dynamic(
  () => import("@/components/shared/PreSignInConsent"),
  { ssr: false, loading: () => null }
);
const PersonalizationGate = dynamic(
  () => import("@/components/shared/PersonalizationGate"),
  { ssr: false, loading: () => null }
);

export default function DeferredProviders() {
  return (
    <>
      <ToastContainer />
      <EasterEggs />
      <GoogleAnalytics />
      <CookieConsent />
      <PreSignInConsent />
      <PersonalizationGate />
    </>
  );
}
