import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import CookieConsent from "@/components/shared/CookieConsent";
import AppShell from "@/components/shared/AppShell";
import ThemeApplier from "@/components/shared/ThemeApplier";
import "./globals.css";

export const metadata: Metadata = {
  title: "RealLearn — The World Is Your Textbook",
  description:
    "Ask anything and learn through a 3-part unlock experience powered by Gemma 4.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider afterSignOutUrl="/">
          <ThemeApplier />
          <AppShell>{children}</AppShell>
          <CookieConsent />
        </ClerkProvider>
      </body>
    </html>
  );
}
