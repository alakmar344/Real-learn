"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import ProgressRail from "@/components/learning/ProgressRail";
import PartCard from "@/components/learning/PartCard";
import QuizSheet from "@/components/learning/QuizSheet";
import CompletionScreen from "@/components/learning/CompletionScreen";
import FollowUpBox from "@/components/learning/FollowUpBox";
import UnlockAnimation from "@/components/learning/UnlockAnimation";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import ErrorState from "@/components/shared/ErrorState";
import LiveRegion from "@/components/shared/LiveRegion";
import { useLessonStore } from "@/store/lessonStore";
import { useSavedJourneysStore, journeySignature } from "@/store/savedJourneysStore";
import { useLesson } from "@/hooks/useLesson";

export default function LearnPage() {
  const [quizPart, setQuizPart] = useState<1 | 2 | 3 | null>(null);
  const [showUnlockFx, setShowUnlockFx] = useState(false);

  const {
    question,
    lesson,
    language,
    level,
    isLoading,
    error,
    unlockedPart,
    completedParts,
    partScores,
    collapsedParts,
    passPart,
    togglePartCollapse,
    resetAll,
    showCompletion,
    showFollowUp,
  } = useLessonStore();

  const saveJourney = useSavedJourneysStore((s) => s.saveJourney);

  const { generateLesson, restart } = useLesson();

  const totalScore = useMemo(() => {
    return (partScores[1] ?? 0) + (partScores[2] ?? 0) + (partScores[3] ?? 0);
  }, [partScores]);

  /* ── Persist a completed journey to local storage (sidebar history) ── */
  useEffect(() => {
    if (!showCompletion || !lesson) return;
    const displayQuestion = lesson.question ?? lesson.topic ?? "";
    const id = journeySignature(displayQuestion, lesson.parts[0]?.title);
    saveJourney({
      id,
      question: displayQuestion,
      language,
      level,
      lesson,
      partScores,
      totalScore,
      savedAt: Date.now(),
    });
    console.log("[frontend][LearnPage] journey saved to history", { id });
  }, [showCompletion, lesson, language, level, partScores, totalScore, saveJourney]);

  useEffect(() => {
    console.log("[frontend][LearnPage] state snapshot", {
      hasQuestion: Boolean(question),
      hasLesson: Boolean(lesson),
      isLoading,
      error,
      unlockedPart,
      completedParts,
      partScores,
      collapsedParts,
      showCompletion,
      showFollowUp,
      quizPart,
      showUnlockFx,
    });
  }, [
    question,
    lesson,
    isLoading,
    error,
    unlockedPart,
    completedParts,
    partScores,
    collapsedParts,
    showCompletion,
    showFollowUp,
    quizPart,
    showUnlockFx,
  ]);

  /* ── Error state ── */
  if (error && !isLoading && !lesson) {
    return (
      <>
        <LiveRegion />
        <ErrorState
          message={error}
          onRetry={() => {
            if (question) generateLesson(question, false);
          }}
          onHome={restart}
        />
      </>
    );
  }

  /* ── Loading cinematic ── */
  if (isLoading && question) {
    return (
      <>
        <LiveRegion />
        <LoadingCinematic
          question={question}
          onCancel={() => {
            resetAll();
            restart();
          }}
        />
      </>
    );
  }

  /* ── No lesson yet ── */
  if (!lesson) {
    return (
      <>
        <LiveRegion />
        <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: 24 }}>
          <Navbar />
          <div style={{ maxWidth: 640, margin: "80px auto", textAlign: "center" }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>📚</p>
            <h2 style={{ fontWeight: 600, marginBottom: 8 }}>No lesson loaded yet</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
              Head back home and ask a question to start learning.
            </p>
            <button
              type="button"
              onClick={restart}
              style={{
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "12px 24px",
                background: "var(--accent)",
                color: "#faf7f2",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Go Home →
            </button>
          </div>
        </main>
      </>
    );
  }

  const activePart = quizPart ? lesson.parts[quizPart - 1] : null;

  return (
    <>
      <LiveRegion />
      <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "var(--bg-glass)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Navbar compact />
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 12px" }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginRight: 8 }}>Understanding:</span>
            <span
              style={{
                fontFamily: "var(--font-playfair)",
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--accent)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "inline-block",
                maxWidth: "100%",
                verticalAlign: "bottom",
              }}
              title={lesson.question ?? lesson.topic ?? ""}
            >
              {lesson.question ?? lesson.topic ?? ""}
            </span>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 64px" }}>
          <ProgressRail unlockedPart={unlockedPart} completedParts={completedParts} />

          {lesson.parts.map((part) => (
            <PartCard
              key={part.partNumber}
              part={part}
              isUnlocked={part.partNumber <= unlockedPart}
              isCompleted={completedParts.includes(part.partNumber)}
              isCollapsed={collapsedParts.includes(part.partNumber)}
              score={partScores[part.partNumber]}
              onStartQuiz={() => setQuizPart(part.partNumber)}
              onToggleCollapse={() => togglePartCollapse(part.partNumber)}
            />
          ))}

          {showCompletion ? (
            <CompletionScreen
              lesson={lesson}
              totalScore={totalScore}
              onRestart={() => {
                resetAll();
                restart();
              }}
            />
          ) : null}

          {showFollowUp ? (
            <FollowUpBox
              onSubmit={async (nextQuestion) => {
                console.log("[frontend][LearnPage] follow-up submit", {
                  nextQuestionLength: nextQuestion.length,
                });
                await generateLesson(nextQuestion, false);
                window.scrollTo({ top: 0, behavior: "smooth" });
                console.log("[frontend][LearnPage] follow-up completed + scrolled");
              }}
            />
          ) : null}

          {!showCompletion && (
            <button
              type="button"
              onClick={() => {
                resetAll();
                restart();
              }}
              style={{
                marginTop: 20,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                background: "transparent",
                color: "var(--text-secondary)",
                padding: "10px 14px",
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Learn Something New
            </button>
          )}
        </div>

        {activePart ? (
          <QuizSheet
            open={quizPart !== null}
            questions={activePart.quiz ?? []}
            onClose={() => setQuizPart(null)}
            onPass={(score) => {
              console.log("[frontend][LearnPage] quiz passed", {
                part: activePart.partNumber,
                score,
              });
              passPart(activePart.partNumber, score);
              setQuizPart(null);
              setShowUnlockFx(true);
              window.setTimeout(() => setShowUnlockFx(false), 850);
            }}
          />
        ) : null}

        <UnlockAnimation show={showUnlockFx} />

        <footer
          style={{
            padding: "20px 24px 32px",
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-tertiary)",
            borderTop: "1px solid var(--border-subtle)",
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>
            You are talking to an AI. Responses are AI-generated and are
            <strong> not reviewed by humans before being shown</strong>. They may be inaccurate,
            incomplete, or outdated. Please verify important information with qualified professionals
            or authoritative sources. This service is not intended for children under 13.
          </p>
          <p style={{ margin: "4px 0 0" }}>
            <a href="/legal?tab=privacy" style={{ color: "var(--text-tertiary)" }}>Privacy Policy</a>
            {" · "}
            <a href="/legal?tab=terms" style={{ color: "var(--text-tertiary)" }}>Terms of Service</a>
            {" · "}
            <a href="/legal" style={{ color: "var(--text-tertiary)" }}>Legal</a>
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11 }}>
            © {new Date().getFullYear()} RealLearn. All rights reserved.
          </p>
        </footer>
      </main>
    </>
  );
}
