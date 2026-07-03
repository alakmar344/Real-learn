"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import Footer from "@/components/shared/Footer";
import { showToast } from "@/components/shared/ToastContainer";
import { useLessonStore } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore, journeySignature } from "@/store/savedJourneysStore";
import { useLesson } from "@/hooks/useLesson";
import { LessonJourney } from "@/types";

export default function LearnPage() {
  const [quizPart, setQuizPart] = useState<number | null>(null);
  const [showUnlockFx, setShowUnlockFx] = useState(false);

  const {
    question,
    lesson,
    isLoading,
    error,
    unlockedPart,
    completedParts,
    partScores,
    collapsedParts,
    passPart,
    togglePartCollapse,
    resetAll,
    resetProgress,
    showCompletion,
    showFollowUp,
  } = useLessonStore();

  const language = usePreferenceStore((s) => s.language);
  const level = usePreferenceStore((s) => s.level);

  const saveJourney = useSavedJourneysStore((s) => s.saveJourney);

  const recordPartPassed = useProgressStore((s) => s.recordPartPassed);
  const recordLessonCompleted = useProgressStore((s) => s.recordLessonCompleted);
  const recordFollowUp = useProgressStore((s) => s.recordFollowUp);

  const { generateLesson, restart } = useLesson();

  const totalParts = lesson?.parts?.length ?? 3;
  const isFastMode = totalParts === 1;

  const totalScore = useMemo(() => {
    return Object.values(partScores).reduce<number>(
      (sum, score) => sum + (score ?? 0),
      0
    );
  }, [partScores]);

  const prevLessonRef = useRef<LessonJourney | null>(null);
  const prevCompletionRef = useRef(false);

  useEffect(() => {
    if (lesson && prevLessonRef.current === null && !showCompletion) {
      showToast("Lesson ready! Let's learn.", "success");
    }
    prevLessonRef.current = lesson;
  }, [lesson, showCompletion]);

  useEffect(() => {
    if (showCompletion && !prevCompletionRef.current) {
      showToast("Journey complete! 🎉", "success");
    }
    prevCompletionRef.current = showCompletion;
  }, [showCompletion]);

  /* ── Persist journey to local storage on generation and on progress changes ── */
  useEffect(() => {
    if (!lesson) return;
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
      unlockedPart,
      completedParts,
    });
    console.log("[frontend][LearnPage] journey saved to history", { id, completedParts, totalScore });
  }, [lesson, language, level, partScores, totalScore, unlockedPart, completedParts, saveJourney]);

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
                color: "var(--on-accent)",
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
            <span
              style={{
                display: "inline-block",
                marginRight: 8,
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "var(--accent)",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent)",
                verticalAlign: "middle",
              }}
            >
              {isFastMode ? "⚡ FAST" : "📚 EXPLAIN"}
            </span>
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
          <ProgressRail unlockedPart={unlockedPart} completedParts={completedParts} totalParts={totalParts} />

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
              onRetake={() => {
                resetProgress();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
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
                recordFollowUp();
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

              // ── Engagement: award XP, streak, daily-goal, badges ──
              const maxPerPart = activePart.quiz?.length ?? 2;
              recordPartPassed({
                score,
                maxPerPart,
                language,
                subject: activePart.subject,
              });
              if (activePart.partNumber === totalParts) {
                const finalTotal = lesson.parts.reduce(
                  (sum, p) =>
                    sum +
                    (p.partNumber === activePart.partNumber
                      ? score
                      : partScores[p.partNumber] ?? 0),
                  0
                );
                recordLessonCompleted({ totalScore: finalTotal, language });
              }

              setQuizPart(null);
              setShowUnlockFx(true);
              window.setTimeout(() => setShowUnlockFx(false), 850);
              showToast(
                score >= 1 ? "Correct! Well done." : "Part completed.",
                score >= 1 ? "success" : "info"
              );
            }}
          />
        ) : null}

        <UnlockAnimation show={showUnlockFx} />

        <Footer />
      </main>
    </>
  );
}
