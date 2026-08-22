"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import QuestionInput from "@/components/homepage/QuestionInput";
import HomeStats from "@/components/homepage/HomeStats";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import LiveRegion from "@/components/shared/LiveRegion";
import dynamic from "next/dynamic";
import { useLesson } from "@/hooks/useLesson";
import { warmupBackend, fetchReady, BACKEND_URL } from "@/lib/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { isConsentCurrent, readLegalConsent, writeLegalConsent } from "@/lib/legalConsent";
import { specialDayFor } from "@/lib/specialDays";
import { Skeleton } from "@/components/shared/Skeleton";

import { useTranslation } from "@/hooks/useTranslation";
import { TranslationKey } from "@/lib/i18n";

const Footer = dynamic(() => import("@/components/shared/Footer"), {
  loading: () => <Skeleton height={120} borderRadius={0} />,
  ssr: true,
});
const FeedbackGate = dynamic(() => import("@/components/shared/FeedbackGate"), {
  loading: () => null,
  ssr: false,
});

function greetingKeyForHour(h: number): TranslationKey {
  if (h < 4) return "hero.greeting.deeply";
  if (h < 7) return "hero.greeting.clearly";
  if (h < 12) return "hero.greeting.master";
  if (h < 17) return "hero.greeting.explore";
  if (h < 21) return "hero.greeting.understand";
  return "hero.greeting.curious";
}

export default function HomePage() {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const [hour, setHour] = useState<number>(12);
  const [specialDay, setSpecialDay] = useState<string | null>(null);
  const { generateLesson } = useLesson();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const firstName = user?.firstName || "";

  const greeting = t(greetingKeyForHour(hour));

  useEffect(() => {
    warmupBackend();
    // Fetch public capabilities once per session. This warms the connection,
    // lets the backend report health/feature flags, and avoids hard-coding
    // constants like maxQuestionLength in the UI.
    fetchReady().catch(() => {});
    const now = new Date();
    setSpecialDay(specialDayFor(now.getMonth() + 1, now.getDate())?.hero ?? null);
    setHour(now.getHours());
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
        const backendUrl = BACKEND_URL;
        const token = await getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${backendUrl}/api/legal-consent`, {
          method: "POST",
          headers,
          signal: AbortSignal.timeout(3500),
          body: JSON.stringify({
            accepted: true,
            timestamp: parsed.timestamp,
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
  }, [isSignedIn, getToken, user?.id]);

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
      <main className="hero-page-wrapper page-column">
        <Navbar />

        <section className="hero">
          <div className="hero__stage">
            <div className="hero-greeting hero__greeting">
              {specialDay ? (
                <h1 className="hero__title" suppressHydrationWarning>
                  {specialDay}
                  {firstName ? (
                    <>
                      ,{" "}
                      <span className="hero__title-name">{firstName}</span>
                    </>
                  ) : null}
                  {"!"}
                </h1>
              ) : greeting ? (
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

            <HomeStats onStartTopic={(topic) => submit(topic)} />
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
