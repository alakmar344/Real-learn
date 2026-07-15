import type { Metadata, Viewport } from "next";
import {
  Inter,
  JetBrains_Mono,
  Lora,
  Playfair_Display,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import CookieConsent from "@/components/shared/CookieConsent";
import GoogleAnalytics from "@/components/shared/GoogleAnalytics";
import PreSignInConsent from "@/components/shared/PreSignInConsent";
import AppShell from "@/components/shared/AppShell";
import ThemeApplier from "@/components/shared/ThemeApplier";
import CrayonBackground from "@/components/shared/CrayonBackground";
import EasterEggs from "@/components/shared/EasterEggs";
import ToastContainer from "@/components/shared/ToastContainer";
import SkipToContent from "@/components/shared/SkipToContent";
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
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RealLearn — The World Is Your Textbook",
  description:
    "Ask anything, learn everything. Unlock knowledge through progressive discovery."
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
};

// Applies the persisted theme BEFORE first paint so dark-theme users never
// see a cream flash (FOUC). Must stay tiny and synchronous.
// Notes: the legacy "reallearn-theme" key holds a zustand persist ENVELOPE
// ({"state":{"theme":...}}), not a bare string; and the theme-color meta must
// UPDATE the existing tag (Next renders one from viewport.themeColor — the
// first meta in tree order wins, so appending a second one did nothing).
const themeInitScript = `(function(){try{var t=null;var p=localStorage.getItem("reallearn-preferences");if(p){var s=JSON.parse(p);t=s&&s.state&&s.state.theme}if(!t){var l=localStorage.getItem("reallearn-theme");if(l){var v=JSON.parse(l);t=typeof v==="string"?v:v&&v.state&&v.state.theme}}if(t==="dark"||t==="twilight"){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=t==="dark"?"#09090b":"#0c0a1d"}}catch(e){}})();`;

// Resolves the visual-performance tier BEFORE first paint so low-end devices
// never pay for a single expensive frame (backdrop blurs, grain, ambient
// animations) and high-end devices get the rich experience immediately.
// Mirrors lib/performance.ts detectPerfTier(); ThemeApplier keeps it in sync
// afterwards when the user changes the setting.
const perfInitScript = `(function(){try{var mode=null;try{var p=localStorage.getItem("reallearn-preferences");if(p){var s=JSON.parse(p);mode=s&&s.state&&s.state.perfMode}}catch(e){}var tier;if(mode==="low"||mode==="high"){tier=mode}else{var mem=navigator.deviceMemory||8;var cores=navigator.hardwareConcurrency||8;var rm=false;try{rm=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}var sd=Boolean(navigator.connection&&navigator.connection.saveData);tier=(mem<=4||cores<=4||rm||sd)?"low":((mem>=8&&cores>=8)?"high":"mid")}document.documentElement.dataset.perf=tier;var ua=(navigator.userAgent||"").toLowerCase();if(ua.indexOf("firefox")>-1&&ua.indexOf("seamonkey")===-1){document.documentElement.dataset.browser="firefox"}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${lora.variable} ${playfair.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: perfInitScript }} />
      </head>
      <body>
        <CrayonBackground />
        <SkipToContent />
        <ClerkProvider afterSignOutUrl="/">
          <ThemeApplier />
          <AppShell>{children}</AppShell>
          <ToastContainer />
          <EasterEggs />
          <GoogleAnalytics />
          <CookieConsent />
          <PreSignInConsent />
        </ClerkProvider>
      </body>
    </html>
  );
}
