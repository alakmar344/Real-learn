"use client";

import { useState, useEffect, useCallback } from "react";
import { Story, Concept, Lesson, Quiz, Level, Language } from "@/types";
import ConceptBubble from "./ConceptBubble";
import DiscoveryPhase from "./DiscoveryPhase";
import ValidationPhase from "./ValidationPhase";
import DeepeningPhase from "./DeepeningPhase";

type Phase = "DISCOVERY" | "VALIDATION" | "DEEPENING";

interface ConceptModalProps {
  story: Story;
  level: Level;
  language: Language;
  onClose: () => void;
}

function ConceptsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 rounded-xl border border-border bg-card animate-shimmer bg-gradient-to-r from-card via-surface to-card bg-[length:200%_100%]"
        />
      ))}
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      {[100, 90, 95, 85, 92, 88].map((w, i) => (
        <div
          key={i}
          className="h-4 rounded animate-shimmer bg-gradient-to-r from-card via-surface to-card bg-[length:200%_100%]"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

function QuizSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-12 rounded-lg border border-border animate-shimmer bg-gradient-to-r from-card via-surface to-card bg-[length:200%_100%]"
        />
      ))}
    </div>
  );
}

const PHASE_LABELS: Record<Phase, string> = {
  DISCOVERY: "Part 1 of 3 — Discovery",
  VALIDATION: "Part 2 of 3 — Validation",
  DEEPENING: "Part 3 of 3 — Deepening",
};

const SUBJECT_BADGE_COLORS: Record<string, string> = {
  Physics: "text-blue-400 bg-blue-900/30 border-blue-700/50",
  Chemistry: "text-emerald-400 bg-emerald-900/30 border-emerald-700/50",
  Economics: "text-amber-400 bg-amber-900/30 border-amber-700/50",
  Biology: "text-pink-400 bg-pink-900/30 border-pink-700/50",
  CS: "text-violet-400 bg-violet-900/30 border-violet-700/50",
  History: "text-red-400 bg-red-900/30 border-red-700/50",
  Geography: "text-teal-400 bg-teal-900/30 border-teal-700/50",
  Mathematics: "text-orange-400 bg-orange-900/30 border-orange-700/50",
  "Political Science": "text-indigo-400 bg-indigo-900/30 border-indigo-700/50",
  "Environmental Science": "text-green-400 bg-green-900/30 border-green-700/50",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-400 bg-emerald-900/30 border-emerald-700/50",
  Medium: "text-yellow-400 bg-yellow-900/30 border-yellow-700/50",
  Hard: "text-red-400 bg-red-900/30 border-red-700/50",
};

export default function ConceptModal({
  story,
  level,
  language,
  onClose,
}: ConceptModalProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [selectedConceptIndex, setSelectedConceptIndex] = useState(0);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [phase, setPhase] = useState<Phase>("DISCOVERY");

  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const fetchConcepts = useCallback(async () => {
    setLoadingConcepts(true);
    setConceptError(null);
    setConcepts([]);
    setSelectedConcept(null);
    setLesson(null);
    setQuiz(null);
    setPhase("DISCOVERY");

    try {
      const res = await fetch("/api/extract-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, level, language }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const c: Concept[] = data.concepts || [];
      setConcepts(c);
      if (c.length > 0) {
        loadConcept(c[0], 0);
      }
    } catch (err) {
      setConceptError(
        err instanceof Error ? err.message : "Failed to extract concepts"
      );
    } finally {
      setLoadingConcepts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, level, language]);

  const loadConcept = async (concept: Concept, index: number) => {
    setSelectedConcept(concept);
    setSelectedConceptIndex(index);
    setLesson(null);
    setQuiz(null);
    setPhase("DISCOVERY");
    setLessonError(null);
    setLoadingLesson(true);

    try {
      const res = await fetch("/api/teach-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, concept, level, language }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLesson(data);
    } catch (err) {
      setLessonError(
        err instanceof Error ? err.message : "Failed to load lesson"
      );
    } finally {
      setLoadingLesson(false);
    }
  };

  const handleUnderstand = async () => {
    if (!selectedConcept || !lesson) return;
    setPhase("VALIDATION");

    if (!quiz) {
      setLoadingQuiz(true);
      try {
        const res = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept: selectedConcept,
            lesson: lesson.lesson,
            level,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setQuiz(data);
      } catch (err) {
        console.error("Quiz generation failed:", err);
      } finally {
        setLoadingQuiz(false);
      }
    }
  };

  const handleNextConcept = () => {
    const nextIndex = selectedConceptIndex + 1;
    if (nextIndex < concepts.length) {
      loadConcept(concepts[nextIndex], nextIndex);
    }
  };

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full md:w-[60%] lg:w-[50%] bg-surface border-l border-border shadow-2xl lesson-panel-animate">
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="shrink-0 border-b border-border bg-surface">
            {/* Story context */}
            <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary line-clamp-1 mb-1">
                  {story.category} · {story.region}
                </p>
                <p className="text-sm text-text-secondary line-clamp-2 leading-snug">
                  {story.headline}
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition-all border border-transparent hover:border-border"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Selected concept header */}
            {selectedConcept && (
              <div className="px-4 pb-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-text-primary">
                    {selectedConcept.name}
                  </h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      SUBJECT_BADGE_COLORS[selectedConcept.subject] ||
                      "text-text-secondary bg-card border-border"
                    }`}
                  >
                    {selectedConcept.subject}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      DIFFICULTY_COLORS[selectedConcept.difficulty] ||
                      "text-text-secondary bg-card border-border"
                    }`}
                  >
                    {selectedConcept.difficulty}
                  </span>
                </div>
              </div>
            )}

            {/* Concept selector tabs */}
            {!loadingConcepts && concepts.length > 1 && (
              <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
                {concepts.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => loadConcept(c, i)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      selectedConcept?.id === c.id
                        ? "border-accent text-accent bg-accent-light"
                        : "border-border text-text-secondary hover:border-accent/50 hover:text-text-primary"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Concepts loading */}
            {loadingConcepts && (
              <div className="space-y-4">
                <p className="text-xs text-text-secondary tracking-widest uppercase font-semibold">
                  Extracting concepts...
                </p>
                <ConceptsSkeleton />
              </div>
            )}

            {/* Concept error */}
            {conceptError && (
              <div className="p-3 bg-card border border-danger/30 rounded-xl text-sm text-danger flex items-center gap-2">
                <span>⚠️ {conceptError}</span>
                <button
                  onClick={fetchConcepts}
                  className="ml-auto underline hover:no-underline text-xs"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Lesson loading */}
            {!loadingConcepts && loadingLesson && (
              <div className="space-y-4">
                <p className="text-xs text-text-secondary tracking-widest uppercase font-semibold">
                  Loading lesson...
                </p>
                <LessonSkeleton />
              </div>
            )}

            {/* Lesson error */}
            {lessonError && !loadingLesson && (
              <div className="p-3 bg-card border border-danger/30 rounded-xl text-sm text-danger">
                ⚠️ {lessonError}
              </div>
            )}

            {/* Phase content */}
            {!loadingConcepts && !loadingLesson && lesson && selectedConcept && (
              <>
                {phase === "DISCOVERY" && (
                  <DiscoveryPhase
                    lesson={lesson}
                    onUnderstand={handleUnderstand}
                  />
                )}

                {phase === "VALIDATION" && (
                  <>
                    {loadingQuiz && (
                      <div className="space-y-4">
                        <p className="text-xs text-text-secondary tracking-widest uppercase font-semibold">
                          Generating quiz...
                        </p>
                        <QuizSkeleton />
                      </div>
                    )}
                    {quiz && !loadingQuiz && (
                      <ValidationPhase
                        quiz={quiz}
                        onComplete={() => setPhase("DEEPENING")}
                      />
                    )}
                  </>
                )}

                {phase === "DEEPENING" && (
                  <DeepeningPhase
                    story={story}
                    concept={selectedConcept}
                    lesson={lesson}
                    language={language}
                    onBack={onClose}
                    onNextConcept={handleNextConcept}
                    hasNextConcept={selectedConceptIndex < concepts.length - 1}
                  />
                )}
              </>
            )}
          </div>

          {/* Footer — phase indicator */}
          {selectedConcept && (
            <div className="shrink-0 border-t border-border px-4 py-3 bg-surface flex items-center justify-between">
              <div className="flex gap-1.5">
                {(["DISCOVERY", "VALIDATION", "DEEPENING"] as Phase[]).map((p, i) => (
                  <div
                    key={p}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      phase === p
                        ? "w-8 bg-accent"
                        : i < (["DISCOVERY", "VALIDATION", "DEEPENING"] as Phase[]).indexOf(phase)
                        ? "w-4 bg-accent/50"
                        : "w-4 bg-border"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-text-secondary font-medium">
                {PHASE_LABELS[phase]}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
