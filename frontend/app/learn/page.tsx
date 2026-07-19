"use client";

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import Navbar from "@/components/shared/Navbar";
import ProgressRail from "@/components/learning/ProgressRail";
import PartCard from "@/components/learning/PartCard";
import QuizSheet from "@/components/learning/QuizSheet";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import ErrorState from "@/components/shared/ErrorState";
import LiveRegion from "@/components/shared/LiveRegion";
import Footer from "@/components/shared/Footer";
import FeedbackGate from "@/components/shared/FeedbackGate";
import { showToast } from "@/components/shared/ToastContainer";
import { useLessonStore } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore, journeySignature } from "@/store/savedJourneysStore";
import { useLesson } from "@/hooks/useLesson";
import { useMounted } from "@/hooks/useMounted";
import { LessonJourney } from "@/types";
import { useShallow } from "zustand/shallow";

const CompletionScreen = lazy(() => import("@/components/learning/CompletionScreen"));
const FollowUpBox = lazy(() => import("@/components/learning/FollowUpBox"));
const UnlockAnimation = lazy(() => import("@/components/learning/UnlockAnimation"));

function SuspenseFallback() {
  return null;
}

function scrollToTop() {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export default function LearnPage() {
  const [quizPart, setQuizPart] = useState<number | null>(null);
  const [showUnlockFx, setShowUnlockFx] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const unlockTimeoutRef = useRef<number | null>(null);
  const revealedLessonRef = useRef<LessonJourney | null>(null);

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
  } = useLessonStore(
    useShallow((state) => ({
      question: state.question,
      lesson: state.lesson,
      isLoading: state.isLoading,
      error: state.error,
      unlockedPart: state.unlockedPart,
      completedParts: state.completedParts,
      partScores: state.partScores,
      collapsedParts: state.collapsedParts,
      passPart: state.passPart,
      togglePartCollapse: state.togglePartCollapse,
      resetAll: state.resetAll,
      resetProgress: state.resetProgress,
      showCompletion: state.showCompletion,
      showFollowUp: state.showFollowUp,
    }))
  );

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

  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    return () => {
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
    };
  }, [mounted]);

  useEffect(() => {
    if (!isLoading && lesson && revealedLessonRef.current !== lesson) {
      revealedLessonRef.current = lesson;
      setIsRevealing(true);
      const timer = setTimeout(() => setIsRevealing(false), 420);
      return () => clearTimeout(timer);
    }
  }, [isLoading, lesson]);

  const prevLessonRef = useRef<LessonJourney | null>(lesson);
  const prevCompletionRef = useRef(showCompletion);

  useEffect(() => {
    if (lesson && prevLessonRef.current === null && !showCompletion) {
      showToast("Your lesson is ready", "success");
    }
    prevLessonRef.current = lesson;
  }, [lesson, showCompletion]);

  useEffect(() => {
    if (showCompletion && !prevCompletionRef.current) {
      showToast("Journey complete", "success");
    }
    prevCompletionRef.current = showCompletion;
  }, [showCompletion]);

  useEffect(() => {
    if (!lesson) return;
    const displayQuestion = lesson.question ?? lesson.topic ?? "";
    const baseId = journeySignature(displayQuestion, lesson.parts[0]?.title);
    const id = lesson.lessonId ? `${baseId}::${lesson.lessonId.slice(0, 8)}` : baseId;
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
    if (process.env.NODE_ENV !== "production") {
      console.log("[frontend][LearnPage] journey saved to history", { id, completedParts, totalScore });
    }
  }, [lesson, language, level, partScores, totalScore, unlockedPart, completedParts, saveJourney]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
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

  if (!mounted) {
    return (
      <>
        <LiveRegion />
        <main style={{ minHeight: "100vh" }} />
      </>
    );
  }

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

  if ((isLoading || isRevealing) && question) {
    return (
      <>
        <LiveRegion />
        <LoadingCinematic
          question={question}
          isRevealing={isRevealing}
          onCancel={() => {
            resetAll();
            restart();
          }}
        />
      </>
    );
  }

  if (!lesson) {
    return (
      <>
        <LiveRegion />
        <main style={{ minHeight: "100vh", color: "var(--text-primary)" }} className="page-enter">
          <Navbar />
          <div style={{ maxWidth: 640, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
            <div
              aria-hidden="true"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--accent-dim)",
                border: "2px solid var(--border-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto var(--space-lg)",
                fontSize: 28,
              }}
            >
              📚
            </div>
            <h2
              style={{
                fontWeight: 800,
                marginBottom: 8,
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 28,
                letterSpacing: "-0.02em",
              }}
            >
              No lesson loaded yet
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 28, lineHeight: 1.6, fontFamily: "var(--font-lora)" }}>
              Head back home and ask a question to start learning.
            </p>
            <button
              type="button"
              onClick={restart}
              className="interactive-press"
              style={{
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "14px 28px",
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                minHeight: 50,
                boxShadow: "var(--shadow-glow-accent)",
                transition: "all 300ms var(--ease-spring)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--glass-edge)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "var(--shadow-glow-accent)";
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 16 }}>←</span>
              Go Home
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
      <main
        style={{
          minHeight: "100vh",
          color: "var(--text-primary)",
        }}
        className="page-enter"
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "var(--bg-glass)",
            backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Navbar compact />
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(16px, 4vw, 48px) 16px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginRight: 10,
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "var(--accent)",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent)",
                verticalAlign: "middle",
              }}
            >
              {isFastMode ? "⚡ FAST" : "🔍 GUIDED"}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)", marginRight: 10, fontWeight: 500 }}>Understanding:</span>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--accent)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "inline-block",
                maxWidth: "100%",
                verticalAlign: "bottom",
                margin: 0,
              }}
              title={lesson.question ?? lesson.topic ?? ""}
            >
              {lesson.question ?? lesson.topic ?? ""}
            </h1>
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(16px, 4vw, 48px) 80px" }} className="stagger-children">
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
            <Suspense fallback={<SuspenseFallback />}>
              <CompletionScreen
                lesson={lesson}
                totalScore={totalScore}
                onRetake={() => {
                  resetProgress();
                  scrollToTop();
                }}
                onRestart={() => {
                  resetAll();
                  restart();
                }}
              />
            </Suspense>
          ) : null}

          {showFollowUp ? (
            <Suspense fallback={<SuspenseFallback />}>
              <div className="wa-divider" aria-hidden="true">
                <span className="wa-divider__bead" />
              </div>
              <FollowUpBox
                onSubmit={async (nextQuestion) => {
                  console.log("[frontend][LearnPage] follow-up submit", {
                    nextQuestionLength: nextQuestion.length,
                  });
                  const ok = await generateLesson(nextQuestion, false);
                  if (ok) recordFollowUp();
                  scrollToTop();
                  console.log("[frontend][LearnPage] follow-up completed + scrolled");
                }}
              />
            </Suspense>
          ) : null}

          {!showCompletion && (
            <button
              type="button"
              onClick={() => {
                resetAll();
                restart();
              }}
              className="interactive-focus"
              style={{
                marginTop: 20,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                background: "transparent",
                color: "var(--text-secondary)",
                padding: "12px 20px",
                cursor: "pointer",
                minHeight: 48,
                transition: "all 300ms var(--ease-spring)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-accent)";
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 16 }}>✨</span>
              Learn Something New
            </button>
          )}

          {!showCompletion && <FeedbackGate />}
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

              const lessonSignature = `${lesson.question ?? lesson.topic ?? ""}|${language}|${lesson.lessonId ?? ""}`;
              const maxPerPart = activePart.quiz?.length ?? 2;
              recordPartPassed({
                score,
                maxPerPart,
                language,
                subject: activePart.subject,
                creditKey: `part|${lessonSignature}|${activePart.partNumber}`,
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
                const maxScore = lesson.parts.reduce(
                  (sum, p) => sum + (p.quiz?.length ?? 2),
                  0
                );
                recordLessonCompleted({
                  totalScore: finalTotal,
                  maxScore,
                  language,
                  creditKey: `lesson|${lessonSignature}`,
                });
              }

              setQuizPart(null);
              setShowUnlockFx(true);
              if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
              unlockTimeoutRef.current = window.setTimeout(() => setShowUnlockFx(false), 850);
              showToast(
                score >= 1 ? "Correct — well done." : "Part completed.",
                score >= 1 ? "success" : "info"
              );
            }}
          />
        ) : null}

        <Suspense fallback={<SuspenseFallback />}>
          <UnlockAnimation show={showUnlockFx} />
        </Suspense>

        <Footer />
      </main>
    </>
  );
}
