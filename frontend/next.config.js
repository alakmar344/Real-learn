/** @type {import('next').NextConfig} */

// Security: the Content-Security-Policy is set per-request in proxy.ts
// (NOT here) so every response carries a fresh script nonce — see the
// commentary there. Static security headers stay in this file.

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
    optimizePackageImports: [
      "react-markdown",
      "remark-gfm",
      "remark-math",
      "rehype-katex",
      "canvas-confetti",
      "@clerk/nextjs",
    ],
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
      // /_next/static is fingerprinted and served immutable by Next itself —
      // a custom rule there is redundant and triggers a build warning. The
      // old /fonts/ and /crayon-bg*.svg rules pointed at assets that no
      // longer exist, and /logo.svg is covered by the *.svg rule above.
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
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
          // Content-Security-Policy is set per-request (with a nonce) in
          // proxy.ts.
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
