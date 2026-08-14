import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/legal(.*)",
  // The first-time wizard: its first slides (welcome, legal+age) happen
  // BEFORE account creation, and its OAuth callback must stay reachable
  // mid-handshake. Signed-in users may also legitimately be here (the
  // personalization slide), so it is never treated as an auth route.
  "/onboarding(.*)",
]);

const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

// ─────────────────────────────────────────────────────────────────────────────
// Content-Security-Policy with per-request nonces.
//
// SECURITY: the CSP used to live in next.config.js with 'unsafe-inline' in
// script-src — which disables CSP's primary protection (any injected inline
// <script> would execute). It now lives here so each request gets a fresh
// nonce: only inline scripts stamped with the nonce run, and 'strict-dynamic'
// lets those trusted scripts load their own dependencies (Next.js bootstrap,
// Clerk, gtag). The host allowlist and 'unsafe-inline' remain ONLY as
// fallbacks for old browsers that don't understand nonces/strict-dynamic —
// modern browsers ignore 'unsafe-inline' whenever a nonce is present.
//
// Next.js reads the nonce from the Content-Security-Policy REQUEST header set
// below and automatically applies it to its own framework scripts; the root
// layout reads `x-nonce` for its first-paint inline scripts.
// ─────────────────────────────────────────────────────────────────────────────

// 'unsafe-eval' is only needed by Next.js's development runtime (react-refresh).
const scriptSrcEval =
  process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "";

function buildCsp(nonce: string): string {
  const clerkDomain = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API
    ? `https://${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API}`
    : "https://clerk.reallearn.site";
  const backendUrl = (
    process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com"
  ).replace(/\/$/, "");

  // Build the CSP from the SAME env-derived hosts the app actually calls
  // (useLesson/useSpeech/legalConsent all honor NEXT_PUBLIC_BACKEND_URL, and
  // Clerk honors NEXT_PUBLIC_CLERK_FRONTEND_API). De-dupe in case the env
  // values equal the defaults already present.
  const uniq = (list: (string | undefined)[]) =>
    Array.from(new Set(list.filter(Boolean))).join(" ");

  const scriptSrc = uniq([
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Fallbacks for browsers without nonce/strict-dynamic support (ignored by
    // modern browsers because a nonce is present):
    "'unsafe-inline'",
    scriptSrcEval,
    "https:",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.reallearn.site",
    clerkDomain,
    "https://challenges.cloudflare.com",
  ]);
  const connectSrc = uniq([
    "'self'",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.reallearn.site",
    clerkDomain,
    "https://real-learn.onrender.com",
    backendUrl,
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://www.googletagmanager.com",
  ]);
  const frameSrc = uniq([
    "'self'",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.reallearn.site",
    clerkDomain,
    "https://challenges.cloudflare.com",
  ]);

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://img.clerk.com https://www.google-analytics.com data:",
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    "worker-src 'self' blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    // Nothing embeds this app; pairs with X-Frame-Options: DENY in
    // next.config.js to shut down clickjacking entirely.
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!isPublicRoute(req)) {
    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Fresh nonce per request. Edge runtime has WebCrypto; base64-encode 128
  // random bits.
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js picks the nonce up from the CSP *request* header and stamps its
  // own framework <script> tags with it.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: [
    // txt/xml matter here: without them /robots.txt, /sitemap.xml and
    // /llms.txt hit Clerk auth and 307 to /sign-in — invisible to crawlers.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
