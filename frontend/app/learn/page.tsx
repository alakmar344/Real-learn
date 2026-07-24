"use client";

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import Navbar from "@/components/shared/Navbar";
import ProgressRail from "@/components/learning/ProgressRail";
import PartCard from "@/components/learning/PartCard";
import QuizSheet from "@/components/learning/QuizSheet";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import ErrorState from "@/components/shared/ErrorState";
import LiveRegion from "@/components/shared/LiveRegion";
import ReadingProgressBar from "@/components/shared/ReadingProgressBar";
import Footer from "@/components/shared/Footer";
import FeedbackGate from "@/components/shared/FeedbackGate";
import { showToast } from "@/components/shared/ToastContainer";
import { useLessonStore } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore, journeySignature } from "@/store/savedJourneysStore";
import { useLesson } from "@/hooks/useLesson";
import { useMounted } from "@/hooks/useMounted";
import { triggerHaptic } from "@/lib/haptics";
import { LessonJourney, LessonPart } from "@/types";
import { useShallow } from "zustand/shallow";
import confetti from "canvas-confetti";

const CompletionScreen = lazy(() => import("@/components/learning/CompletionScreen"));
const FollowUpBox = lazy(() => import("@/components/learning/FollowUpBox"));
const UnlockAnimation = lazy(() => import("@/components/learning/UnlockAnimation"));

function SuspenseFallback() {
  return null;
}

function scrollToTop() {
  // Respect prefers-reduced-motion: an explicit behavior option overrides the
  // CSS `scroll-behavior: auto !important` reduced-motion rule.
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
  // Guards the reveal so it fires exactly once per lesson. Keying it on the
  // lesson object (not a boolean) also prevents the reveal effect from
  // re-arming on unrelated re-renders.
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

  // The lesson store is persisted: rendering persisted state on the first
  // client render mismatches the SSR HTML (which always has the defaults)
  // and triggers a React hydration failure. Gate on mount instead.
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    return () => {
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
    };
  }, [mounted]);

  // When a lesson lands, fade the loading overlay out and reveal the lesson.
  // `isRevealing` is deliberately NOT in the dependency array: including it
  // made the effect's own setState re-run it synchronously, which cleared the
  // 420ms timer before it fired and left `isRevealing` stuck `true` forever —
  // the invisible overlay then blocked the (never-rendered) lesson, i.e. a
  // blank page after the loader hit 100%. The `revealedLessonRef` guard keeps
  // this from re-arming for the same lesson.
  useEffect(() => {
    if (!isLoading && lesson && revealedLessonRef.current !== lesson) {
      revealedLessonRef.current = lesson;
      setIsRevealing(true);
      const timer = setTimeout(() => setIsRevealing(false), 420);
      return () => clearTimeout(timer);
    }
  }, [isLoading, lesson]);

  // Initialize from the CURRENT (already-hydrated) store values — the lesson
  // store persists, so starting these at null/false made every reload of a
  // persisted lesson re-fire "Lesson ready!" / "Journey complete! 🎉" toasts.
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

  /* ── Persist journey to local storage on generation and on progress changes ── */
  useEffect(() => {
    if (!lesson) return;
    const displayQuestion = lesson.question ?? lesson.topic ?? "";
    // Fold the per-instance lesson id into the saved-journey key so two
    // different generations of the same question never overwrite each other's
    // history/archive entry (content signatures alone can collide).
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

  /* ── Hydration gate: neutral shell until the client has mounted ── */
  if (!mounted) {
    return (
      <>
        <LiveRegion />
        <main style={{ minHeight: "100vh" }} />
      </>
    );
  }

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

  /* ── No lesson yet ── */
  if (!lesson) {
    return (
      <>
        <LiveRegion />
        <main style={{ minHeight: "100vh", color: "var(--text-primary)", padding: 24 }}>
          <Navbar />
          <div style={{ maxWidth: 640, margin: "80px auto", textAlign: "center" }}>
            <h2
              style={{
                fontWeight: 700,
                marginBottom: 8,
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 26,
              }}
            >
              No lesson loaded yet
            </h2>
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

  // Shared pass path: invoked by QuizSheet on a successful quiz AND directly
  // by the part CTA when a part arrives with an empty quiz — opening the
  // sheet for zero questions rendered nothing and deadlocked the journey.
  // `score` is the FIRST-ATTEMPT score (see QuizSheet), so perfect-part
  // stats mean "aced on the first try".
  const handlePartPass = (part: LessonPart, score: number) => {
    console.log("[frontend][LearnPage] quiz passed", {
      part: part.partNumber,
      score,
    });
    triggerHaptic("success");
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#b8860b", "#e0b341", "#d4847a", "#ffffff"],
      disableForReducedMotion: true,
    });
    passPart(part.partNumber, score);

    // Include the per-instance lesson id: retaking a quiz on THIS
    // lesson stays idempotent (no XP farming), but generating a NEW
    // lesson for the same question tomorrow earns credit again —
    // previously the content-only key silently blocked all XP,
    // daily-goal and streak progress for repeat topics.
    const lessonSignature = `${lesson.question ?? lesson.topic ?? ""}|${language}|${lesson.lessonId ?? ""}`;
    const maxPerPart = part.quiz?.length ?? 2;
    recordPartPassed({
      score,
      maxPerPart,
      language,
      subject: part.subject,
      creditKey: `part|${lessonSignature}|${part.partNumber}`,
    });
    if (part.partNumber === totalParts) {
      const finalTotal = lesson.parts.reduce(
        (sum, p) =>
          sum +
          (p.partNumber === part.partNumber
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
  };

  return (
    <>
      <LiveRegion />
      <ReadingProgressBar />
      <main
        style={{
          minHeight: "100vh",
          color: "var(--text-primary)",
        }}
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
              {isFastMode ? "FAST" : "GUIDED"}
            </span>
             <span style={{ fontSize: 13, color: "var(--text-tertiary)", marginRight: 10 }}>Understanding:</span>
            {/* The lesson question is the page's h1 (WCAG 1.3.1/2.4.6) —
                visually styled as the compact header line it always was. */}
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

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(16px, 4vw, 48px) 80px" }}>
          <ProgressRail unlockedPart={unlockedPart} completedParts={completedParts} totalParts={totalParts} />

          {lesson.parts.map((part) => (
            <PartCard
              key={part.partNumber}
              part={part}
              isUnlocked={part.partNumber <= unlockedPart}
              isCompleted={completedParts.includes(part.partNumber)}
              isCollapsed={collapsedParts.includes(part.partNumber)}
              score={partScores[part.partNumber]}
              onStartQuiz={() => {
                // Empty-quiz guard: a part with zero questions can't be
                // "passed" through the sheet (it would render nothing), so
                // advance directly with score = max (0 for an empty quiz).
                if ((part.quiz?.length ?? 0) === 0) {
                  handlePartPass(part, 0);
                  return;
                }
                setQuizPart(part.partNumber);
              }}
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
              {/* Harmony divider — a balanced checker bead between the lesson
                  and the follow-up, marking a considered pause before going
                  deeper. */}
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

          {/* Optional, anonymous review — appears the day after the first
              lesson on any return visit (not only at the moment of completion).
              Hidden while the completion screen is up to avoid a duplicate. */}
          {!showCompletion && <FeedbackGate />}
        </div>

        {activePart ? (
          <QuizSheet
            open={quizPart !== null}
            questions={activePart.quiz ?? []}
            onClose={() => setQuizPart(null)}
            onPass={(score) => handlePartPass(activePart, score)}
          />
        ) : null}

        <Suspense fallback={<SuspenseFallback />}>
          <UnlockAnimation show={showUnlockFx} />
        </Suspense>

        <Footer className="app-footer" />
      </main>
    </>
  );
}
