import fs from "node:fs";
import path from "node:path";
import { MetadataRoute } from "next";

// Generated at build time so the filesystem scan below always sees the app
// source tree (the standalone runtime bundle does not ship it).
export const dynamic = "force-static";

const BASE_URL = "https://reallearn.site";

// Crawler-visible routes only. Everything else (/learn, /progress, /settings)
// sits behind Clerk auth in proxy.ts and would just 307 to /sign-in —
// listing those wastes crawl budget and pollutes the index.
const STATIC_PUBLIC_ROUTES: {
  route: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}[] = [
  { route: "/", changeFrequency: "weekly", priority: 1 },
  { route: "/sign-in/", changeFrequency: "monthly", priority: 0.4 },
  { route: "/sign-up/", changeFrequency: "monthly", priority: 0.4 },
];

// Auto-index the public legal docs from the filesystem so new pages under
// app/legal/ appear in the sitemap without touching this file.
function discoverLegalRoutes(): string[] {
  const legalDir = path.join(process.cwd(), "app", "legal");
  const routes: string[] = [];
  try {
    if (fs.existsSync(path.join(legalDir, "page.tsx"))) {
      routes.push("/legal/");
    }
    for (const entry of fs.readdirSync(legalDir, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        fs.existsSync(path.join(legalDir, entry.name, "page.tsx"))
      ) {
        routes.push(`/legal/${entry.name}/`);
      }
    }
  } catch {
    // Directory missing (unexpected) — fall back to the root-only sitemap.
  }
  return routes;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    ...STATIC_PUBLIC_ROUTES.map(({ route, changeFrequency, priority }) => ({
      url: `${BASE_URL}${route}`,
      lastModified,
      changeFrequency,
      priority,
    })),
    ...discoverLegalRoutes().map((route) => ({
      url: `${BASE_URL}${route}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: route === "/legal/" ? 0.6 : 0.5,
    })),
  ];
}
