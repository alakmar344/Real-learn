/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://img.clerk.com https://www.google-analytics.com data:; connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://real-learn.onrender.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com; frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://challenges.cloudflare.com; worker-src 'self' blob:; font-src 'self'; media-src 'self' blob:; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",

          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
