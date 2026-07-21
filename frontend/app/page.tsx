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
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Navbar />

        <section className="hero">
          <div className="hero__stage">
            <div className="hero__glow" aria-hidden="true" />

            {/* Mandala-lotus watermark — visible Indian learning motif without font/glyph dependencies. */}
            <svg
              className="hero__mandala"
              aria-hidden="true"
              viewBox="0 0 120 120"
            >
              <circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="60" cy="60" r="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M60 16 C70 34 70 46 60 60 C50 46 50 34 60 16Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M60 104 C50 86 50 74 60 60 C70 74 70 86 60 104Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M16 60 C34 50 46 50 60 60 C46 70 34 70 16 60Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M104 60 C86 70 74 70 60 60 C74 50 86 50 104 60Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M29 29 C48 35 56 43 60 60 C43 56 35 48 29 29Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M91 29 C85 48 77 56 60 60 C64 43 72 35 91 29Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M91 91 C72 85 64 77 60 60 C77 64 85 72 91 91Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M29 91 C35 72 43 64 60 60 C56 77 48 85 29 91Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
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

            <div className="hero__learning-roots" aria-label="Indian learning heritage">
              <span>विद्या</span>
              <span>Gurukul</span>
              <span>Nalanda</span>
              <span>Takshashila</span>
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
