"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import QuestionInput from "@/components/homepage/QuestionInput";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import LiveRegion from "@/components/shared/LiveRegion";
import PreSignInConsent from "@/components/shared/PreSignInConsent";
import Footer from "@/components/shared/Footer";
import { useLesson } from "@/hooks/useLesson";
import { useAuth } from "@clerk/nextjs";

const LEGAL_CONSENT_KEY = "reallearn-legal-consent";

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const { generateLesson } = useLesson();
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    console.log("[frontend][HomePage] render state", {
      questionLength: question.length,
      hasLoadingQuestion: Boolean(loadingQuestion),
    });
  }, [question, loadingQuestion]);

  useEffect(() => {
    const syncLegalConsent = async () => {
      if (!isSignedIn) return;
      const stored = localStorage.getItem(LEGAL_CONSENT_KEY);
      if (!stored) return;
      let parsed;
      try {
        parsed = JSON.parse(stored) as { accepted: boolean; timestamp: string };
        if (!parsed.accepted) return;
      } catch {
        return;
      }

      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";
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
            privacyVersion: "1.0",
            termsVersion: "1.0",
          }),
        });

        if (res.ok) {
          console.log("[frontend][HomePage] legal consent synced to backend", {
            timestamp: parsed.timestamp,
          });
        }
      } catch {
        // best-effort
      }
    };
    syncLegalConsent();
  }, [isSignedIn, getToken]);

  const submit = async () => {
    const normalized = question.trim();
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
              &ldquo;Education is the kindling of a flame, not the filling of a vessel.&rdquo;
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
              Ask anything. Learn in 3 unlockable parts. Prove you understand before going deeper.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <QuestionInput question={question} setQuestion={setQuestion} onSubmit={submit} />
            </div>
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
