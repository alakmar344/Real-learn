import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import CookieConsent from "@/components/shared/CookieConsent";
import GoogleAnalytics from "@/components/shared/GoogleAnalytics";
import PreSignInConsent from "@/components/shared/PreSignInConsent";
import AppShell from "@/components/shared/AppShell";
import ThemeApplier from "@/components/shared/ThemeApplier";
import ToastContainer from "@/components/shared/ToastContainer";
import "./globals.css";

export const metadata: Metadata = {
  title: "RealLearn — The World Is Your Textbook",
  description:
    "Ask anything and unlock knowledge through progressive discovery."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
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
