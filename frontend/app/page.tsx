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
import { Skeleton } from "@/components/shared/Skeleton";

const Footer = dynamic(() => import("@/components/shared/Footer"), {
  loading: () => <Skeleton height={120} borderRadius={0} />,
  ssr: true,
});
const FeedbackGate = dynamic(() => import("@/components/shared/FeedbackGate"), {
  loading: () => null,
  ssr: false,
});

// Time-of-day greeting — casual and direct, like a friend, not a formal
// "Good morning" email. Short so the hero type stays huge.
function greetingForHour(h: number): string {
  if (h < 4) return "Still up?";
  if (h < 7) return "Up early";
  if (h < 12) return "Morning";
  if (h < 17) return "Hey";
  if (h < 21) return "Evening";
  return "Late night mode";
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
            <div className="hero-greeting hero__greeting">
              <div 
                className="hero__badge cyber-badge scale-in" 
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 8, 
                  padding: "6px 14px", 
                  borderRadius: "999px", 
                  background: "var(--brand-soft)", 
                  border: "1px solid var(--border-neon)", 
                  color: "var(--text-accent-strong)", 
                  fontSize: 12, 
                  fontWeight: 700, 
                  letterSpacing: "0.06em", 
                  textTransform: "uppercase", 
                  marginBottom: 12, 
                  boxShadow: "0 0 16px var(--accent-glow)" 
                }}
              >
                <span className="typing-cursor" aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand)", display: "inline-block" }}></span>
                ⚡ Built for Gen Z • Zero Boring Lectures
              </div>
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

            <div className="hero__content" style={{ marginTop: 24 }}>
              <HomeStats onStartTopic={(topic) => submit(topic)} />
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
