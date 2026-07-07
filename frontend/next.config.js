/** @type {import('next').NextConfig} */

// Security: 'unsafe-eval' is only needed by Next.js's development runtime
// (react-refresh). Shipping it to production would let any injected script
// use eval/Function, so it is added in dev builds only.
const scriptSrcEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const nextConfig = {
  reactStrictMode: true,
  // Security: don't advertise the framework via X-Powered-By.
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }],
  },
  async headers() {
    return [
      {
        // BANDWIDTH: public/ assets change rarely; let browsers keep them for
        // a day and serve stale while revalidating instead of re-downloading.
        source: "/:path*.svg",
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
            // microphone=(self) is required for the voice-input (speech
            // recognition) feature; everything else stays fully denied.
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
            value:
              // worker-src blob: — Clerk spawns a blob-URL Worker for session
              // refresh; without it the worker falls back to script-src (no
              // blob:) and is blocked. challenges.cloudflare.com — Clerk's
              // bot protection (Turnstile) renders in a Cloudflare iframe.
              // *.google-analytics.com — GA4 sends EU-consent traffic to
              // regional hosts (region1.google-analytics.com etc.).
              // object-src 'none' + frame-ancestors 'self' close the plugin
              // and clickjacking vectors CSP can cover; 'unsafe-eval' is
              // dev-only (see scriptSrcEval above).
              `default-src 'self'; script-src 'self' 'unsafe-inline'${scriptSrcEval} https://www.googletagmanager.com https://www.google-analytics.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://img.clerk.com https://www.google-analytics.com data:; connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://real-learn.onrender.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com; frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://challenges.cloudflare.com; worker-src 'self' blob:; font-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`,

          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
