import type { Metadata, Viewport } from "next";
import {
  Inter,
  JetBrains_Mono,
  Lora,
  Space_Grotesk,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import AppShell from "@/components/shared/AppShell";
import ThemeApplier from "@/components/shared/ThemeApplier";
import CrayonBackground from "@/components/shared/CrayonBackground";
import SkipToContent from "@/components/shared/SkipToContent";
import DeferredProviders from "@/components/shared/DeferredProviders";
import "./globals.css";

// Self-hosted fonts via next/font: subsetted, cached immutably, zero
// render-blocking requests — and, unlike the old Google Fonts @import, not
// blocked by our own CSP (style-src/font-src are 'self').
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const lora = Lora({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});
// Display face: Space Grotesk — a working designer's grotesk (quirky enough to
// have personality, disciplined enough to never read as a template).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RealLearn — AI-Powered Interactive Learning Platform",
    template: "%s | RealLearn",
  },
  description:
    "RealLearn is an AI-powered interactive learning platform that transforms any question into a structured 3-part lesson with quizzes, progress tracking, achievements, and text-to-speech. Ask anything, learn everything with adaptive AI tutoring.",
  keywords: [
    "AI learning platform",
    "interactive education",
    "personalized learning",
    "AI tutor",
    "adaptive learning",
    "knowledge discovery",
    "quiz generator",
    "progress tracking",
    "educational technology",
    "online learning",
    "AI-powered education",
    "lifelong learning",
    "skill development",
    "real-time feedback",
    "gamified learning",
    "achievement system",
    "text-to-speech learning",
    "accessible education",
    "AI lesson generator",
    "study assistant",
  ],
  authors: [{ name: "RealLearn" }],
  creator: "RealLearn",
  publisher: "RealLearn",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://reallearn.site"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://reallearn.site",
    title: "RealLearn — AI-Powered Interactive Learning Platform",
    description:
      "Transform any question into a structured 3-part lesson with quizzes, progress tracking, achievements, and text-to-speech. Ask anything, learn everything.",
    siteName: "RealLearn",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RealLearn — AI-Powered Interactive Learning Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RealLearn — AI-Powered Interactive Learning Platform",
    description:
      "Transform any question into a structured 3-part lesson with quizzes, progress tracking, achievements, and text-to-speech. Ask anything, learn everything.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f6f2",
};

// Applies the persisted theme BEFORE first paint so dark-theme users never
// see a cream flash (FOUC). Must stay tiny and synchronous.
// Notes: the legacy "reallearn-theme" key holds a zustand persist ENVELOPE
// ({"state":{"theme":...}}), not a bare string; and the theme-color meta must
// UPDATE the existing tag (Next renders one from viewport.themeColor — the
// first meta in tree order wins, so appending a second one did nothing).
const themeInitScript = `(function(){try{var t=null;var p=localStorage.getItem("reallearn-preferences");if(p){var s=JSON.parse(p);t=s&&s.state&&s.state.theme}if(!t){var l=localStorage.getItem("reallearn-theme");if(l){var v=JSON.parse(l);t=typeof v==="string"?v:v&&v.state&&v.state.theme}}if(t==="dark"||t==="twilight"){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=t==="dark"?"#101014":"#0e0a1e"}}catch(e){}})();`;

// Resolves the visual-performance tier BEFORE first paint so low-end devices
// never pay for a single expensive frame (backdrop blurs, grain, ambient
// animations) and high-end devices get the rich experience immediately.
// Mirrors lib/performance.ts detectPerfTier(); ThemeApplier keeps it in sync
// afterwards when the user changes the setting.
const perfInitScript = `(function(){try{var mode=null;try{var p=localStorage.getItem("reallearn-preferences");if(p){var s=JSON.parse(p);mode=s&&s.state&&s.state.perfMode}}catch(e){}var tier;if(mode==="low"||mode==="high"){tier=mode}else{var mem=navigator.deviceMemory||8;var cores=navigator.hardwareConcurrency||8;var rm=false;try{rm=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}var sd=Boolean(navigator.connection&&navigator.connection.saveData);tier=(mem<=4||cores<=4||rm||sd)?"low":((mem>=8&&cores>=8)?"high":"mid")}document.documentElement.dataset.perf=tier;var ua=(navigator.userAgent||"").toLowerCase();if(ua.indexOf("firefox")>-1&&ua.indexOf("seamonkey")===-1){document.documentElement.dataset.browser="firefox"}}catch(e){}})();`;

// Adds a seasonal Japanese accent class based on the current month so the UI
// subtly shifts with the seasons (spring=sakura, summer=green, autumn=maple,
// winter=snow). Runs once per page load.
const seasonalInitScript = `(function(){try{var m=new Date().getMonth();var s="winter";if(m>=2&&m<=4)s="spring";else if(m>=5&&m<=7)s="summer";else if(m>=8&&m<=10)s="autumn";document.documentElement.dataset.season=s}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${lora.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: perfInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: seasonalInitScript }} />
        {/* Structured data for AI crawlers and search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "RealLearn",
              description:
                "AI-powered interactive learning platform that transforms any question into a structured 3-part lesson with quizzes, progress tracking, achievements, and text-to-speech.",
              url: "https://reallearn.site",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "AI-powered lesson generation",
                "Interactive quizzes and assessments",
                "Progress tracking and achievements",
                "Text-to-speech learning",
                "Adaptive learning paths",
                "Personalized study recommendations",
                "Multi-language support",
                "Accessible design with keyboard navigation",
              ],
              audience: {
                "@type": "Audience",
                audienceType: "Students, lifelong learners, professionals",
              },
              inLanguage: "en",
              accessibilityFeature: [
                "keyboardNavigation",
                "screenReaderSupport",
                "highContrastDisplay",
                "textToSpeech",
              ],
            }),
          }}
        />
        {/* PERFORMANCE: preconnect to critical origins so lesson-generation requests,
            auth handshakes, and analytics avoid extra DNS+TCP round-trips. */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "https://real-learn.onrender.com"} crossOrigin="anonymous" />
        <link rel="preconnect" href="https://img.clerk.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://clerk.reallearn.site" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://*.clerk.accounts.dev" />
        <link rel="dns-prefetch" href="https://*.clerk.com" />
        {/* PERFORMANCE: critical fonts are self-hosted via next/font, which
            injects the correct <link rel="preload" as="font"> tags (with its
            immutable hashed /_next/static/media/*.woff2 URLs) automatically in
            production — rendering text in the real face immediately, with no
            fallback-font flash (FOUT). The old manual preloads pointed at
            /fonts/*.woff2, which do not exist (next/font self-hosts under
            /_next/static/media), so they 404'd on every load and wasted the
            preload budget. They are intentionally omitted here. */}
        {/* PERFORMANCE: prefetch the most likely navigation target. */}
        <link rel="prefetch" href="/learn" />
      </head>
      <body>
        <CrayonBackground />
        <SkipToContent />
        <ClerkProvider afterSignOutUrl="/">
          <ThemeApplier />
          <AppShell>{children}</AppShell>
          <DeferredProviders />
        </ClerkProvider>
      </body>
    </html>
  );
}
