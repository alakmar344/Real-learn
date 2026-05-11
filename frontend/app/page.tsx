"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import QuestionInput from "@/components/homepage/QuestionInput";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import { useLesson } from "@/hooks/useLesson";

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const { generateLesson } = useLesson();

  useEffect(() => {
    console.log("[frontend][HomePage] render state", {
      questionLength: question.length,
      hasLoadingQuestion: Boolean(loadingQuestion),
    });
  }, [question, loadingQuestion]);

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
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 800 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              letterSpacing: "0.15em",
              color: "var(--gold-primary)",
              fontWeight: 500,
            }}
          >
            <span
              className="gold-pulse-dot"
              style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold-primary)" }}
            />
            POWERED BY GEMMA 4
          </div>
          <h1
            style={{
              margin: "20px 0 0",
              fontFamily: "var(--font-playfair)",
              fontWeight: 900,
              lineHeight: 1.05,
              color: "var(--text-primary)",
              fontSize: "clamp(40px, 8vw, 64px)",
            }}
          >
            The World Is
            <br />
            <span style={{ position: "relative", display: "inline-block" }}>
              Your Textbook
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 4,
                  height: 3,
                  background: "var(--gold-primary)",
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
              fontSize: 18,
              lineHeight: 1.6,
            }}
          >
            Ask anything. Learn in 3 unlockable parts. Prove you understand before going deeper.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <QuestionInput question={question} setQuestion={setQuestion} onSubmit={submit} />
          </div>
        </div>
      </section>

      <footer style={{ paddingBottom: 32, textAlign: "center", fontSize: 12, color: "#333333" }}>
        Available in 8 Indian languages · 3 learning levels
      </footer>

      {loadingQuestion ? <LoadingCinematic question={loadingQuestion} /> : null}
    </main>
  );
}
