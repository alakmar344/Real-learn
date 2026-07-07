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
    "Ask anything and unlock knowledge through progressive discovery."
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
};

// Applies the persisted theme BEFORE first paint so dark-theme users never
// see a cream flash (FOUC). Must stay tiny and synchronous.
// Notes: the legacy "reallearn-theme" key holds a zustand persist ENVELOPE
// ({"state":{"theme":...}}), not a bare string; and the theme-color meta must
// UPDATE the existing tag (Next renders one from viewport.themeColor — the
// first meta in tree order wins, so appending a second one did nothing).
const themeInitScript = `(function(){try{var t=null;var p=localStorage.getItem("reallearn-preferences");if(p){var s=JSON.parse(p);t=s&&s.state&&s.state.theme}if(!t){var l=localStorage.getItem("reallearn-theme");if(l){var v=JSON.parse(l);t=typeof v==="string"?v:v&&v.state&&v.state.theme}}if(t==="dark"||t==="twilight"){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=t==="dark"?"#0b100f":"#12101f"}}catch(e){}})();`;

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
      </head>
      <body>
        <SkipToContent />
        <GoogleAnalytics />
        <ClerkProvider afterSignOutUrl="/">
          <ThemeApplier />
          <AppShell>{children}</AppShell>
          <ToastContainer />
          <CookieConsent />
          <PreSignInConsent />
        </ClerkProvider>
      </body>
    </html>
  );
}
