import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth-gated app surfaces just 307 to /sign-in for a crawler —
        // excluding them saves crawl budget and keeps the index clean.
        disallow: ["/api/", "/_next/", "/learn/", "/progress/", "/settings/"],
      },
    ],
    sitemap: "https://reallearn.site/sitemap.xml",
    host: "https://reallearn.site",
  };
}
