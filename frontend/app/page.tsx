"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import QuestionInput from "@/components/homepage/QuestionInput";
import HomeStats from "@/components/homepage/HomeStats";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import LiveRegion from "@/components/shared/LiveRegion";
import dynamic from "next/dynamic";
import { useLesson } from "@/hooks/useLesson";
import { useAuth, useUser } from "@clerk/nextjs";
import { isConsentCurrent, readLegalConsent, writeLegalConsent } from "@/lib/legalConsent";

const Footer = dynamic(() => import("@/components/shared/Footer"), {
  loading: () => <div style={{ height: 120 }} aria-hidden="true" />,
  ssr: true,
});
const FeedbackGate = dynamic(() => import("@/components/shared/FeedbackGate"), {
  loading: () => null,
  ssr: false,
});

// time-of-day greeting
function greetingForHour(h: number): string {
  if (h < 4) return "Still up?";
  if (h < 7) return "Good morning";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good evening";
}

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const { generateLesson } = useLesson();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress || "";
  const fallbackEmail = user?.emailAddresses?.[0]?.emailAddress || "";
  const firstName = user?.firstName || "";

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  // One-time sync of locally-stored legal consent to the backend once we know
  // the Clerk user id (consent may have been recorded before sign-in).
  useEffect(() => {
    const syncLegalConsent = async () => {
      if (!isSignedIn || !user?.id) return;
      const parsed = readLegalConsent();
      if (!parsed?.accepted) return;
      if (parsed.syncedClerkId === user.id) return;
      if (!isConsentCurrent(parsed)) return;

      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com";
        const token = await getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${backendUrl}/api/legal-consent`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            accepted: true,
            timestamp: parsed.timestamp,
            email: primaryEmail || fallbackEmail,
            privacyVersion: parsed.privacyVersion,
            termsVersion: parsed.termsVersion,
          }),
        });

        if (res.ok) {
          const latest = readLegalConsent();
          writeLegalConsent({ ...(latest ?? parsed), syncedClerkId: user.id });
        }
      } catch {
        // best-effort
      }
    };
    syncLegalConsent();
  }, [isSignedIn, getToken, user?.id, primaryEmail, fallbackEmail]);

  const submit = async (override?: string) => {
    const normalized = (override ?? question).trim();
    if (!normalized) return;
    setLoadingQuestion(normalized);
    await generateLesson(normalized, true);
    setLoadingQuestion(null);
  };

  return (
    <>
      <LiveRegion />
      <main className="hero" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />

        <section className="hero">
          <div className="hero__stage">
            <div className="hero__glow" aria-hidden="true" />

            {/* Enso brush watermark — cultural signature without glyphs (no FOUC). */}
            <svg
              className="hero__enso"
              aria-hidden="true"
              viewBox="0 0 120 120"
            >
              <path
                d="M86 16 A48 48 0 1 0 104 52"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M84 20 A44 44 0 1 0 100 54"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>

            <div className="hero__content">
              <HomeStats onStartTopic={(topic) => submit(topic)} />
            </div>

            <div className="hero-greeting hero__greeting">
              {greeting ? (
                <h1 className="hero__title" suppressHydrationWarning>
                  {greeting}
                  {firstName ? (
                    <>
                      ,{" "}
                      <span className="hero__title-name">{firstName}</span>
                    </>
                  ) : null}
                </h1>
              ) : (
                <div className="hero__spacer" aria-hidden="true" />
              )}
            </div>

            <div className="hero__input-row">
              <QuestionInput question={question} setQuestion={setQuestion} onSubmit={submit} />
            </div>
          </div>
        </section>

        <Footer className="app-footer" />

        {/* Optional anonymous review — appears the day after the first lesson. */}
        <FeedbackGate />

        {loadingQuestion ? (
          <LoadingCinematic question={loadingQuestion} />
        ) : null}
      </main>
    </>
  );
}
