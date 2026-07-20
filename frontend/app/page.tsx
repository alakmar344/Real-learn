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

/** Warm, time-aware greeting — the app says hello like a friend would. */
function greetingForHour(h: number): string {
  if (h < 4) return "Still awake?";
  if (h < 7) return "Up with the sun";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "A quiet night";
}

/** A small time-of-day companion emoji to make the hello feel alive. */
function iconForHour(h: number): string {
  if (h < 4) return "🌙";
  if (h < 7) return "🌅";
  if (h < 12) return "☀️";
  if (h < 17) return "🌤️";
  if (h < 21) return "🌆";
  return "✨";
}

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const [greetingIcon, setGreetingIcon] = useState("");
  const { generateLesson } = useLesson();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress || "";
  const fallbackEmail = user?.emailAddresses?.[0]?.emailAddress || "";
  const firstName = user?.firstName || "";

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setGreeting(greetingForHour(hour));
    setGreetingIcon(iconForHour(hour));
  }, []);

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
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

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
    if (!normalized) {
      console.log("[frontend][HomePage] submit skipped: empty question");
      return;
    }
    console.log("[frontend][HomePage] submit started", {
      questionLength: normalized.length,
    });
    setLoadingQuestion(normalized);
    await generateLesson(normalized, true);
    setLoadingQuestion(null);
    console.log("[frontend][HomePage] submit finished");
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

        <section
          style={{
            flex: 1,
            padding: "clamp(20px, 5vh, 48px) clamp(16px, 4vw, 32px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: 0,
          }}
        >
          <div style={{ width: "100%", maxWidth: 800, position: "relative" }}>
            {/* Soft decorative glow behind the greeting — vermillion/washi warmth
                to match the Japanese palette (an old cobalt-blue tint used to
                bleed through here, clashing with the theme). */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "45%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(420px, 75vw)",
                height: "min(220px, 40vw)",
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse at center, var(--accent-glow) 0%, var(--sun-wash) 45%, transparent 70%)",
                filter: "blur(50px)",
                zIndex: 0,
                pointerEvents: "none",
              }}
            />

            {/* Ensō — the hand-drawn zen circle of practice and open-ended
                learning. A wordless brush watermark: it carries the cultural
                signature without any glyphs, so nothing text-like can flash
                in a fallback font before the webfonts load (no FOUC glare). */}
            <svg
              aria-hidden="true"
              viewBox="0 0 120 120"
              style={{
                position: "absolute",
                top: "50%",
                right: "clamp(-8px, 2vw, 24px)",
                transform: "translateY(-50%) rotate(-8deg)",
                width: "clamp(140px, 22vw, 230px)",
                height: "auto",
                color: "var(--brand)",
                opacity: 0.07,
                zIndex: 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {/* Two offset arcs mimic the swelling ink of a single brush pass,
                  finishing with the ensō's characteristic open gap. */}
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

            {/* The slim daily-spark / resume strip sits above the greeting */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <HomeStats onStartTopic={(topic) => submit(topic)} />
            </div>

            {/* Personal, time-aware hello */}
            <div
              className="hero-greeting"
              style={{
                position: "relative",
                zIndex: 1,
                marginTop: 24,
              }}
            >
              {greeting ? (
                <h1
                  suppressHydrationWarning
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 900,
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                    fontSize: "clamp(42px, 8vw, 76px)",
                    color: "var(--text-primary)",
                  }}
                >
                  <span
                    className="hero-greeting-icon"
                    aria-hidden="true"
                    style={{ marginRight: 12 }}
                  >
                    {greetingIcon}
                  </span>
                  {greeting}
                  {firstName ? (
                    <>
                      ,{" "}
                      <span
                        style={{
                          background: "var(--accent-gradient)",
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          color: "transparent",
                        }}
                      >
                        {firstName}
                      </span>
                    </>
                  ) : null}
                </h1>
              ) : (
                <div style={{ height: 76 }} aria-hidden="true" />
              )}
            </div>

            <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", marginTop: 20 }}>
              <QuestionInput question={question} setQuestion={setQuestion} onSubmit={submit} />
            </div>
          </div>
        </section>

        <Footer className="app-footer" />

        {/* Optional, anonymous review — shows the day after the first lesson
            on any return visit, so it is never missed after a refresh. */}
        <FeedbackGate />

        {loadingQuestion ? (
          <LoadingCinematic question={loadingQuestion} />
        ) : null}
      </main>
    </>
  );
}
