"use client";

import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import Navbar from "@/components/shared/Navbar";
import ProgressRail from "@/components/learning/ProgressRail";
import QuizSheet, { QuizAttemptState } from "@/components/learning/QuizSheet";
import LoadingCinematic from "@/components/shared/LoadingCinematic";
import ErrorState from "@/components/shared/ErrorState";
import LiveRegion from "@/components/shared/LiveRegion";
import ReadingProgressBar from "@/components/shared/ReadingProgressBar";
import Footer from "@/components/shared/Footer";
import MathText from "@/components/shared/MathText";
import { showToast } from "@/components/shared/ToastContainer";
import { useLessonStore, journeyIdForLesson } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useLesson } from "@/hooks/useLesson";
import { useMounted } from "@/hooks/useMounted";
import { Skeleton, SkeletonCard } from "@/components/shared/Skeleton";
import { triggerHaptic } from "@/lib/haptics";
import { LessonJourney, LessonPart } from "@/types";
import { useShallow } from "zustand/shallow";
import { useTranslation } from "@/hooks/useTranslation";

// PartCard pulls in the full react-markdown + remark/rehype + KaTeX toolchain
// (the bulk of the /learn route JS). Code-splitting it keeps that chain out of
// the learn shell — the loading cinematic, error and empty states hydrate
// without it, and the chunk streams in alongside the lesson content.
const PartCard = lazy(() => import("@/components/learning/PartCard"));
// Same deferred treatment the homepage gives it — the gate is invisible on
// first paint and shouldn't weigh down the learn shell bundle.
const FeedbackGate = lazy(() => import("@/components/shared/FeedbackGate"));
const CompletionScreen = lazy(() => import("@/components/learning/CompletionScreen"));
const Flashcards = lazy(() => import("@/components/learning/Flashcards"));
const FollowUpBox = lazy(() => import("@/components/learning/FollowUpBox"));
const UnlockAnimation = lazy(() => import("@/components/learning/UnlockAnimation"));

function SuspenseFallback() {
  return null;
}

function OptimisticLessonShell({ expectedParts }: { expectedParts: number }) {
  const count = Math.max(1, Math.min(expectedParts, 3));
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={180} />
      ))}
    </>
  );
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
  const { t } = useTranslation();
  const [quizPart, setQuizPart] = useState<number | null>(null);
  // Snapshot of the resumed attempt for the part being opened — captured in
  // the open handler because refs can't be read during render.
  const [quizInitialState, setQuizInitialState] = useState<QuizAttemptState | null>(null);
  const [showUnlockFx, setShowUnlockFx] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const unlockTimeoutRef = useRef<number | null>(null);
  // Per-part in-flight quiz attempts, kept across sheet close/reopen so banked
  // correct answers and the first-attempt score survive (closing the sheet
  // must not launder a failed first try into a "perfect" one). Session-only:
  // a ref, never persisted; cleared on new lesson, retake and part pass.
  const quizAttemptsRef = useRef<Record<number, QuizAttemptState>>({});

  const {
    question,
    lesson,
    hydratingLesson,
    isLoading,
    error,
    expectedParts,
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
      hydratingLesson: state.hydratingLesson,
      isLoading: state.isLoading,
      error: state.error,
      expectedParts: state.expectedParts,
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

  // Guards the reveal so it fires exactly once per lesson. Keying it on the
  // lesson object (not a boolean) also prevents the reveal effect from
  // re-arming on unrelated re-renders. Initialized from the CURRENT (already-
  // hydrated) lesson so reloading a persisted lesson does NOT re-play the
  // 420ms loading/reveal cinematic — the reveal is armed only when a lesson
  // transitions in during this session.
  const revealedLessonRef = useRef<LessonJourney | null>(lesson);

  // Initialize from the CURRENT (already-hydrated) store values — the lesson
  // store persists, so starting these at null/false made every reload of a
  // persisted lesson re-fire "Lesson ready!" / "Journey complete!" toasts.
  const prevLessonRef = useRef<LessonJourney | null>(lesson);
  const prevCompletionRef = useRef(showCompletion);

  const language = usePreferenceStore((s) => s.language);
  const level = usePreferenceStore((s) => s.level);

  const saveJourney = useSavedJourneysStore((s) => s.saveJourney);

  const recordPartPassed = useProgressStore((s) => s.recordPartPassed);
  const recordLessonCompleted = useProgressStore((s) => s.recordLessonCompleted);
  const recordFollowUp = useProgressStore((s) => s.recordFollowUp);

  const { generateLesson, restart } = useLesson();

  const totalParts = lesson?.parts?.length ?? 3;

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

  // The persisted store keeps only lesson METADATA; the body arrives async
  // from the IndexedDB archive (see lessonStore). When that restore lands,
  // sync the once-per-lesson guard refs BEFORE the reveal/toast effects below
  // run (declaration order = execution order), so reloading a persisted
  // lesson still doesn't re-play the cinematic or re-fire "lesson ready".
  const wasHydratingRef = useRef(hydratingLesson);
  useEffect(() => {
    if (hydratingLesson) {
      wasHydratingRef.current = true;
      return;
    }
    if (wasHydratingRef.current) {
      wasHydratingRef.current = false;
      revealedLessonRef.current = lesson;
      prevLessonRef.current = lesson;
      prevCompletionRef.current = showCompletion;
    }
  }, [hydratingLesson, lesson, showCompletion]);

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

  // New lesson (or loaded journey) → any in-flight quiz attempts are stale.
  useEffect(() => {
    quizAttemptsRef.current = {};
  }, [lesson]);

  useEffect(() => {
    if (lesson && prevLessonRef.current === null && !showCompletion) {
      showToast(t("learn.readyToast"), "success");
    }
    prevLessonRef.current = lesson;
  }, [lesson, showCompletion, t]);

  useEffect(() => {
    if (showCompletion && !prevCompletionRef.current) {
      showToast(t("learn.completeToast"), "success");
      // Bring the payoff into view: the completion screen mounts below the last
      // part card (and is lazy), so acing the final quiz otherwise leaves the
      // viewport parked on the part card. Wait a frame for it to render.
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const timer = window.setTimeout(() => {
        document
          .querySelector(".completion")
          ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }, 80);
      prevCompletionRef.current = showCompletion;
      return () => window.clearTimeout(timer);
    }
    prevCompletionRef.current = showCompletion;
  }, [showCompletion, t]);

  /* ── Persist journey to local storage on generation and on progress changes ── */
  useEffect(() => {
    if (!lesson) return;
    const displayQuestion = lesson.question ?? lesson.topic ?? "";
    // Attribute the journey to the lesson's OWN language/level — current prefs
    // may have changed since generation, and reopening an old journey must not
    // relabel it (preference values are a legacy-lesson fallback only).
    const lessonLanguage = lesson.language ?? language;
    const lessonLevel = lesson.level ?? level;
    // Fold the per-instance lesson id into the saved-journey key so two
    // different generations of the same question never overwrite each other's
    // history/archive entry (content signatures alone can collide). Computed
    // via the shared helper so lessonStore's rehydration finds the same
    // archive entry.
    const id = journeyIdForLesson({
      lessonId: lesson.lessonId,
      question: lesson.question,
      topic: lesson.topic,
      firstPartTitle: lesson.parts[0]?.title,
    });
    // savedAt below is only honored on FIRST save — the store preserves the
    // original stamp on upserts, so progress updates and mere re-opens never
    // rewrite history order or the learning-profile recency window.
    saveJourney({
      id,
      question: displayQuestion,
      language: lessonLanguage,
      level: lessonLevel,
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
      if (process.env.NODE_ENV !== "production") {
        console.log("[frontend][LearnPage] quiz passed", {
          part: part.partNumber,
          score,
        });
      }
      triggerHaptic("success");
      passPart(part.partNumber, score);
      // The attempt is settled — a later reopen of this part starts clean.
      delete quizAttemptsRef.current[part.partNumber];

      // Credit is attributed to the lesson's OWN language, never current
      // prefs: switching language in Settings must not mint new credit keys
      // for the same instance (XP double-credit) or pollute languagesUsed.
      // Preference value is only a fallback for legacy persisted lessons.
      const lessonLanguage = lesson.language ?? language;
      // Include the per-instance lesson id: retaking a quiz on THIS
      // lesson stays idempotent (no XP farming), but generating a NEW
      // lesson for the same question tomorrow earns credit again —
      // previously the content-only key silently blocked all XP,
      // daily-goal and streak progress for repeat topics.
      const lessonSignature = `${lesson.question ?? lesson.topic ?? ""}|${lessonLanguage}|${lesson.lessonId ?? ""}`;
      const maxPerPart = part.quiz?.length ?? 2;
      recordPartPassed({
        score,
        maxPerPart,
        language: lessonLanguage,
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
          language: lessonLanguage,
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
      setQuizInitialState(quizAttemptsRef.current[part.partNumber] ?? null);
      setQuizPart(part.partNumber);
    },
    [handlePartPass]
  );

  const handleQuizStateChange = useCallback(
    (state: QuizAttemptState) => {
      if (quizPart !== null) quizAttemptsRef.current[quizPart] = state;
    },
    [quizPart]
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

  /* ── Hydration gate: neutral shell until the client has mounted AND any
        persisted lesson body has been restored from the IndexedDB archive ── */
  if (!mounted || hydratingLesson) {
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
            <h1 className="learn-empty__title">{t("learn.emptyTitle")}</h1>
            <p className="learn-empty__sub">
              {t("learn.emptySub")}
            </p>
            <button type="button" onClick={restart} className="btn-primary">
              {t("learn.goHome")}
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
            {/* The lesson question is the page's h1 (WCAG 1.3.1/2.4.6) —
                visually styled as the compact header line it always was. */}
            <h1 className="learn-topbar__question" title={lesson.question ?? lesson.topic ?? ""}>
              <MathText text={lesson.question ?? lesson.topic ?? ""} />
            </h1>
          </div>
        </div>

        <div className="learn-container">
          <ProgressRail unlockedPart={unlockedPart} completedParts={completedParts} totalParts={totalParts} />

          <Suspense
            fallback={
              expectedParts ? (
                <OptimisticLessonShell expectedParts={expectedParts} />
              ) : (
                <>
                  <SkeletonCard height={180} />
                  <SkeletonCard height={180} />
                  <SkeletonCard height={180} />
                </>
              )
            }
          >
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
          </Suspense>

          {/* Flashcards are recall practice built from EVERY part's content, so
              they only appear once the journey is complete — showing them
              mid-lesson would leak still-locked parts past the quiz gate. */}
          {showCompletion ? (
            <Suspense fallback={<SuspenseFallback />}>
              <Flashcards lesson={lesson} />
            </Suspense>
          ) : null}

          {showCompletion ? (
            <Suspense fallback={<SuspenseFallback />}>
              <CompletionScreen
                lesson={lesson}
                totalScore={totalScore}
                onRetake={() => {
                  quizAttemptsRef.current = {};
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
                  const ok = await generateLesson(nextQuestion, false);
                  if (ok) recordFollowUp();
                  scrollToTop();
                }}
              />
            </Suspense>
          ) : null}

          {/* Optional, anonymous review — appears the day after the first
              lesson on any return visit (not only at the moment of completion).
              Hidden while the completion screen is up to avoid a duplicate. */}
          {!showCompletion && (
            <Suspense fallback={<SuspenseFallback />}>
              <FeedbackGate />
            </Suspense>
          )}
        </div>

        {activePart ? (
          <QuizSheet
            open={quizPart !== null}
            questions={activePart.quiz ?? []}
            partNumber={activePart.partNumber}
            initialState={quizInitialState}
            onStateChange={handleQuizStateChange}
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
