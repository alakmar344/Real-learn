"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import QuestionInput from "@/components/homepage/QuestionInput";
import HomeStats from "@/components/homepage/HomeStats";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import LiveRegion from "@/components/shared/LiveRegion";
import PreSignInConsent from "@/components/shared/PreSignInConsent";
import Footer from "@/components/shared/Footer";
import { useLesson } from "@/hooks/useLesson";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  readLegalConsent,
  writeLegalConsent,
} from "@/lib/legalConsent";

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

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  // Sync a consent accepted BEFORE sign-in to the backend, once per user.
  // Previously this posted hardcoded version "1.0" on EVERY home visit —
  // fighting the v1.2 re-consent check and wasting a request per page load.
  useEffect(() => {
    const syncLegalConsent = async () => {
      if (!isSignedIn || !user?.id) return;
      const parsed = readLegalConsent();
      if (!parsed?.accepted) return;
      if (parsed.syncedClerkId === user.id) return;

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
            email:
              user?.primaryEmailAddress?.emailAddress ||
              user?.emailAddresses?.[0]?.emailAddress ||
              "",
            privacyVersion: parsed.privacyVersion || CURRENT_PRIVACY_VERSION,
            termsVersion: parsed.termsVersion || CURRENT_TERMS_VERSION,
          }),
        });

        if (res.ok) {
          writeLegalConsent({ ...parsed, syncedClerkId: user.id });
        }
      } catch {
        // best-effort
      }
    };
    syncLegalConsent();
  }, [isSignedIn, getToken, user?.id]);

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
      <PreSignInConsent />
      <main
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Navbar />

        <section
          style={{
            flex: 1,
            padding: "24px 16px",
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
                letterSpacing: "0.1em",
                color: "var(--text-tertiary)",
                fontWeight: 500,
                margin: "0 0 8px",
                fontFamily: "var(--font-lora)",
                fontStyle: "italic",
              }}
            >
              {quote || " "}
            </p>
            <h1
              style={{
                margin: "20px 0 0",
                fontFamily: "var(--font-playfair)",
                fontWeight: 900,
                lineHeight: 1.05,
                color: "var(--text-primary)",
                fontSize: "clamp(40px, 8vw, 64px)",
                letterSpacing: "-0.02em",
              }}
            >
              The World Is
              <br />
              <span style={{ position: "relative", display: "inline-block" }}>
                Your Textbook
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 4,
                    height: 3,
                    background: "var(--accent)",
                    transform: "skew(-1deg)",
                  }}
                />
              </span>
            </h1>
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: 480,
                color: "var(--text-secondary)",
                fontSize: "var(--text-lg)",
                lineHeight: 1.6,
                fontFamily: "var(--font-lora)",
                fontStyle: "italic",
              }}
            >
              Ask anything. Get an instant answer in Fast mode, or master it in a 3-part Explain journey.
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
