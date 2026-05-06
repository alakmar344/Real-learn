import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RealLearn — The World Is Your Textbook",
  description:
    "Real news. Real concepts. No textbooks. RealLearn transforms today's global events into interactive lessons powered by Gemma 4 AI.",
  keywords: [
    "education",
    "news",
    "learning",
    "AI",
    "Gemma",
    "science",
    "real-world learning",
  ],
  openGraph: {
    title: "RealLearn — The World Is Your Textbook",
    description:
      "Real news. Real concepts. No textbooks. Learn physics, economics, biology and more through today's headlines.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
