"use client";

import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
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
import MathText from "@/components/shared/MathText";
import { showToast } from "@/components/shared/ToastContainer";
import { useLessonStore } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore, journeySignature } from "@/store/savedJourneysStore";
import { useLesson } from "@/hooks/useLesson";
import { useMounted } from "@/hooks/useMounted";
import { Skeleton, SkeletonCard } from "@/components/shared/Skeleton";
import { triggerHaptic } from "@/lib/haptics";
import { LessonJourney, LessonPart } from "@/types";
import { useShallow } from "zustand/shallow";
import { celebrationColors } from "@/lib/palette";

const CompletionScreen = lazy(() => import("@/components/learning/CompletionScreen"));
const Flashcards = lazy(() => import("@/components/learning/Flashcards"));
const FollowUpBox = lazy(() => import("@/components/learning/FollowUpBox"));
const UnlockAnimation = lazy(() => import("@/components/learning/UnlockAnimation"));

// canvas-confetti stays out of the initial learn bundle; the module is warmed
// when a quiz opens so the celebration fires without a fetch delay.
const loadConfetti = () => import("canvas-confetti").then((m) => m.default);

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

function scrollToPart(partNumber: number) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = document.getElementById(`part-${partNumber}`);
  if (el) {
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
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
  // persisted lesson re-fire "Lesson ready!" / "Journey complete!" toasts.
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

  // Shared pass path: invoked by QuizSheet on a successful quiz AND directly
  // by the part CTA when a part arrives with an empty quiz — opening the
  // sheet for zero questions rendered nothing and deadlocked the journey.
  // `score` is the FIRST-ATTEMPT score (see QuizSheet), so perfect-part
  // stats mean "aced on the first try".
  // Defined as stable useCallbacks BEFORE the early returns (Rules of Hooks)
  // so PartCard's memo() actually holds: inline per-part closures re-created
  // every render forced all cards to re-render (and re-parse markdown) on
  // any page state change.
  const handlePartPass = useCallback(
    (part: LessonPart, score: number) => {
      if (!lesson) return;
      console.log("[frontend][LearnPage] quiz passed", {
        part: part.partNumber,
        score,
      });
      triggerHaptic("success");
      loadConfetti().then((confetti) =>
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: celebrationColors(),
          disableForReducedMotion: true,
        })
      );
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

      const nextPartNumber = part.partNumber + 1;
      if (nextPartNumber <= totalParts) {
        setTimeout(() => scrollToPart(nextPartNumber), 50);
      }
    },
    [lesson, language, totalParts, partScores, passPart, recordPartPassed, recordLessonCompleted]
  );

  const handleStartQuiz = useCallback(
    (part: LessonPart) => {
      // Empty-quiz guard: a part with zero questions can't be "passed"
      // through the sheet (it would render nothing), so advance directly
      // with score = max (0 for an empty quiz).
      if ((part.quiz?.length ?? 0) === 0) {
        handlePartPass(part, 0);
        return;
      }
      void loadConfetti();
      setQuizPart(part.partNumber);
    },
    [handlePartPass]
  );

  const handleToggleCollapse = useCallback(
    (partNumber: number) => {
      const isCollapsed = collapsedParts.includes(partNumber);
      togglePartCollapse(partNumber);
      setTimeout(() => {
        if (isCollapsed) {
          scrollToPart(partNumber);
        } else {
          const nextPartNumber = partNumber + 1;
          if (nextPartNumber <= totalParts) {
            scrollToPart(nextPartNumber);
          }
        }
      }, 50);
    },
    [collapsedParts, togglePartCollapse, totalParts]
  );

  /* ── Hydration gate: neutral shell until the client has mounted ── */
  if (!mounted) {
    return (
      <>
        <LiveRegion />
        <main className="flow-page">
          <Navbar />
          <div className="learn-container learn-container--loading" aria-label="Loading lesson...">
            <Skeleton height={40} width="60%" borderRadius="8px" />
            <Skeleton height={24} width="100%" borderRadius="12px" />
            <SkeletonCard height={180} />
            <SkeletonCard height={180} />
            <SkeletonCard height={180} />
          </div>
        </main>
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
        <main className="flow-page">
          <Navbar />
          <div className="learn-empty">
            <h2 className="learn-empty__title">No lesson loaded yet</h2>
            <p className="learn-empty__sub">
              Head back home and ask a question to start learning.
            </p>
            <button type="button" onClick={restart} className="btn-primary">
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
      <ReadingProgressBar />
      <main className="flow-page">
        <div className="learn-topbar">
          <Navbar compact />
          <div className="learn-topbar__row">
            <span className="learn-topbar__mode">{isFastMode ? "FAST" : "GUIDED"}</span>
            {/* The lesson question is the page's h1 (WCAG 1.3.1/2.4.6) —
                visually styled as the compact header line it always was. */}
            <h1 className="learn-topbar__question" title={lesson.question ?? lesson.topic ?? ""}>
              <MathText text={lesson.question ?? lesson.topic ?? ""} />
            </h1>
          </div>
        </div>

        <div className="learn-container">
          <ProgressRail unlockedPart={unlockedPart} completedParts={completedParts} totalParts={totalParts} />

          {lesson.parts.map((part) => (
            <PartCard
              key={part.partNumber}
              part={part}
              isUnlocked={part.partNumber <= unlockedPart}
              isCompleted={completedParts.includes(part.partNumber)}
              isCollapsed={collapsedParts.includes(part.partNumber)}
              score={partScores[part.partNumber]}
              onStartQuiz={handleStartQuiz}
              onToggleCollapse={handleToggleCollapse}
            />
          ))}

          {/* Flashcards appear as soon as the lesson generates — a spaced-
              repetition style recap built from the lesson's key takeaways. */}
          <Suspense fallback={<SuspenseFallback />}>
            <Flashcards lesson={lesson} />
          </Suspense>

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
              className="btn-ghost flow-gap-lg"
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
