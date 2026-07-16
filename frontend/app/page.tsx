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
import { isConsentCurrent, readLegalConsent, writeLegalConsent } from "@/lib/legalConsent";

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
  // Greeting is rendered after mount so SSR and the client never disagree.
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

  // Sync a consent accepted BEFORE sign-in to the backend, once per user.
  // Previously this posted hardcoded version "1.0" on EVERY home visit —
  // fighting the current-version re-consent check and wasting a request per page load.
  useEffect(() => {
    const syncLegalConsent = async () => {
      if (!isSignedIn || !user?.id) return;
      const parsed = readLegalConsent();
      if (!parsed?.accepted) return;
      if (parsed.syncedClerkId === user.id) return;
      // Only sync a consent record that matches the currently required
      // policy versions. Older acceptances must be re-accepted through the
      // PreSignInConsent re-accept flow; syncing them here would stamp the
      // server's current version onto a stale acceptance and suppress the
      // re-prompt forever.
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
            // Anchor the greeting + input to the LOWER area of the hero. A
            // column that justifies to flex-end pushes the whole block toward
            // the bottom (kept clear of the footer by the bottom padding),
            // which reads far calmer than the old dead-center placement that
            // left the text floating uncomfortably high.
            padding: "32px 16px clamp(56px, 10vh, 128px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            textAlign: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 800, position: "relative" }}>
            {/* Soft decorative glow behind the greeting */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -55%)",
                width: "min(520px, 90vw)",
                height: "min(260px, 45vw)",
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse at center, rgba(96, 85, 226, 0.12) 0%, rgba(244, 166, 200, 0.08) 45%, transparent 70%)",
                filter: "blur(40px)",
                zIndex: 0,
                pointerEvents: "none",
              }}
            />

            {/* Personal, time-aware hello — rendered after mount so SSR and
                the client never disagree. The only text on the welcome screen. */}
            <div
              className="hero-greeting"
              style={{
                position: "relative",
                zIndex: 1,
                minHeight: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {greeting ? (
                <h1
                  suppressHydrationWarning
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-playfair)",
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
                    style={{ marginRight: 16 }}
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
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
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

            <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
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
