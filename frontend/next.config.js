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
  async headers() {
    const clerkDomain = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API
      ? `https://${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API}`
      : "https://clerk.reallearn.site";
    const backendUrl =
      (process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com").replace(/\/$/, "");

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
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline'${scriptSrcEval} https://www.googletagmanager.com https://www.google-analytics.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://img.clerk.com https://www.google-analytics.com data:; connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://real-learn.onrender.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com; frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.reallearn.site https://challenges.cloudflare.com; worker-src 'self' blob:; font-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`,
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
