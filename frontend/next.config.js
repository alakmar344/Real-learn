/** @type {import('next').NextConfig} */

// Security: 'unsafe-eval' is only needed by Next.js's development runtime
// (react-refresh). Shipping it to production would let any injected script
// use eval/Function, so it is added in dev builds only.
const scriptSrcEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: true,
  output: "standalone",
  compress: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }],
    minimumCacheTTL: 86400,
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["react-markdown", "remark-gfm"],
  },
  async redirects() {
    return [
      {
        source: "/reallan",
        destination: "/",
        permanent: true,
      },
      {
        source: "/reallan/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/real-learn",
        destination: "/",
        permanent: true,
      },
    ];
  },

  async headers() {
    const clerkDomain = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API
      ? `https://${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API}`
      : "https://clerk.reallearn.site";
    const backendUrl =
      (process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com").replace(/\/$/, "");

    // Build the CSP from the SAME env-derived hosts the app actually calls
    // (useLesson/useSpeech/legalConsent all honor NEXT_PUBLIC_BACKEND_URL, and
    // Clerk honors NEXT_PUBLIC_CLERK_FRONTEND_API). Previously these were
    // computed but the CSP string hardcoded the production hosts, so any deploy
    // pointing at a different backend/Clerk domain had every fetch blocked by
    // connect-src with no obvious cause. De-dupe in case the env values equal
    // the defaults already present.
    const uniq = (list) => Array.from(new Set(list.filter(Boolean))).join(" ");
    const scriptSrc = uniq([
      "'self'",
      "'unsafe-inline'",
      scriptSrcEval.trim(),
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
    const csp = [
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
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/crayon-bg.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/crayon-bg-mobile.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/logo.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "0" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, private",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
