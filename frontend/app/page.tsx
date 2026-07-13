"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import QuestionInput from "@/components/homepage/QuestionInput";
import HomeStats from "@/components/homepage/HomeStats";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import LiveRegion from "@/components/shared/LiveRegion";
import Footer from "@/components/shared/Footer";
import { useLesson } from "@/hooks/useLesson";
import { useAuth, useUser } from "@clerk/nextjs";
import { readLegalConsent, writeLegalConsent } from "@/lib/legalConsent";

const QUOTES = [
  "Education is the kindling of a flame, not the filling of a vessel.",
  "Live as if you were to die tomorrow. Learn as if you were to live forever.",
  "The only true wisdom is in knowing you know nothing.",
  "Learning never exhausts the mind.",
  "The mind is not a vessel to be filled, but a fire to be kindled.",
  "Tell me and I forget. Teach me and I remember. Involve me and I learn.",
  "Education is not preparation for life; education is life itself.",
  "The beautiful thing about learning is that nobody can take it away from you.",
  "An investment in knowledge pays the best interest.",
  "Curiosity is the wick in the candle of learning.",
];

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  // Pick the quote after mount: choosing randomly during render made the SSR
  // HTML and the client's first render disagree → hydration error + flicker.
  const [quote, setQuote] = useState("");
  const { generateLesson } = useLesson();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress || "";
  const fallbackEmail = user?.emailAddresses?.[0]?.emailAddress || "";

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  // Sync a consent accepted BEFORE sign-in to the backend, once per user.
  // Previously this posted hardcoded version "1.0" on EVERY home visit —
  // fighting the current-version re-consent check and wasting a request per page load.
  useEffect(() => {
    const syncLegalConsent = async () => {
      if (!isSignedIn || !user?.id) return;
      const parsed = readLegalConsent();
      if (!parsed?.accepted) return;
      if (parsed.syncedClerkId === user.id) return;
      // A legacy record without version fields predates the versioned-consent
      // flow. Uploading it as the CURRENT versions would fabricate a v1.3
      // acceptance the user never made and permanently suppress the re-accept
      // modal — skip it and let PreSignInConsent collect fresh consent.
      if (!parsed.privacyVersion || !parsed.termsVersion) return;

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
          // Re-read before writing: the POST can take many seconds (Render
          // cold start), during which the user may have accepted a NEWER
          // policy version — merging onto the stale `parsed` snapshot would
          // clobber that fresh record.
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
      {/* PreSignInConsent is rendered once globally in app/layout.tsx — a
          second instance here stacked two independent consent modals. */}
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
            padding: "32px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 800 }}>
            <p
              style={{
                fontSize: 14,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--accent)",
                fontWeight: 600,
                margin: "0 0 12px",
                fontFamily: "var(--font-inter)",
              }}
            >
              {quote || "\u00A0"}
            </p>
            <h1
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-playfair)",
                fontWeight: 900,
                lineHeight: 1.05,
                color: "var(--text-primary)",
                fontSize: "clamp(44px, 9vw, 72px)",
                letterSpacing: "-0.03em",
              }}
            >
              The World Is
              <br />
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  color: "var(--accent)",
                }}
              >
                Your Textbook
              </span>
            </h1>
            <p
              style={{
                margin: "20px auto 0",
                maxWidth: 500,
                color: "var(--text-secondary)",
                fontSize: "var(--text-lg)",
                lineHeight: 1.6,
                fontFamily: "var(--font-lora)",
                fontStyle: "italic",
              }}
            >
             No pressure, no trick questions. Start with a quick answer, then switch to a guided 3-part journey when you want to go deeper.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <QuestionInput question={question} setQuestion={setQuestion} onSubmit={submit} />
            </div>

            <HomeStats onStartTopic={(topic) => submit(topic)} />
          </div>
        </section>

        <Footer />

        {loadingQuestion ? (
          <LoadingCinematic question={loadingQuestion} />
        ) : null}
      </main>
    </>
  );
}
