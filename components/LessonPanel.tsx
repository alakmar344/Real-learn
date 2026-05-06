"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Story, Concept, Lesson, Quiz, Level, Language } from "@/types";
import ConceptBubble from "./ConceptBubble";
import QuizBlock from "./QuizBlock";
import SourceTag from "./SourceTag";

interface LessonPanelProps {
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

export default function LessonPanel({
  story,
  level,
  language,
  onClose,
}: LessonPanelProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    fetchConcepts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);

  const fetchConcepts = useCallback(async () => {
    setLoadingConcepts(true);
    setConceptError(null);
    setConcepts([]);
    setSelectedConcept(null);
    setLesson(null);
    setQuiz(null);
    setShowQuiz(false);

    try {
      const res = await fetch("/api/extract-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, level, language }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConcepts(data.concepts || []);
    } catch (err) {
      setConceptError(
        err instanceof Error ? err.message : "Failed to extract concepts"
      );
    } finally {
      setLoadingConcepts(false);
    }
  }, [story, level, language]);

  const handleConceptClick = async (concept: Concept) => {
    if (selectedConcept?.id === concept.id && lesson) return;
    setSelectedConcept(concept);
    setLesson(null);
    setQuiz(null);
    setShowQuiz(false);
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

  const handleGenerateQuiz = async () => {
    if (!selectedConcept || !lesson) return;
    setShowQuiz(true);
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
  };

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full md:w-[60%] lg:w-[40%] bg-surface md:border-l border-border shadow-2xl lesson-panel-animate">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="shrink-0 flex items-start justify-between gap-4 p-4 md:p-6 border-b border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-accent tracking-widest uppercase">
                  {story.category}
                </span>
                <span className="text-xs text-text-secondary">{story.region}</span>
              </div>
              <h2 className="text-base md:text-lg font-bold text-text-primary leading-tight line-clamp-3">
                {story.headline}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition-all border border-transparent hover:border-border"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Concepts section */}
            <div>
              <h3 className="text-xs font-semibold text-text-secondary tracking-widest uppercase mb-3">
                Hidden Academic Concepts
              </h3>
              {loadingConcepts && <ConceptsSkeleton />}
              {conceptError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {conceptError}
                  <button
                    onClick={fetchConcepts}
                    className="ml-2 underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingConcepts && !conceptError && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {concepts.map((concept) => (
                    <ConceptBubble
                      key={concept.id}
                      concept={concept}
                      isSelected={selectedConcept?.id === concept.id}
                      onClick={handleConceptClick}
                      isLoading={loadingLesson}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Lesson section */}
            {(loadingLesson || lesson || lessonError) && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-text-secondary tracking-widest uppercase">
                    The Lesson
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {loadingLesson && <LessonSkeleton />}

                {lessonError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    {lessonError}
                  </div>
                )}

                {lesson && !loadingLesson && (
                  <div className="animate-fade-in space-y-4">
                    {/* Key takeaway */}
                    {lesson.keyTakeaway && (
                      <div className="p-3 bg-accent-light border border-accent/20 rounded-xl">
                        <p className="text-xs font-semibold text-accent mb-1 tracking-wide uppercase">
                          Key Insight
                        </p>
                        <p className="text-sm text-text-primary leading-relaxed">
                          {lesson.keyTakeaway}
                        </p>
                      </div>
                    )}

                    {/* Lesson content */}
                    <div className="prose prose-sm max-w-none prose-headings:text-text-primary prose-p:text-text-secondary prose-p:leading-relaxed prose-strong:text-text-primary prose-code:text-accent prose-a:text-accent prose-li:text-text-secondary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {lesson.lesson}
                      </ReactMarkdown>
                    </div>

                    {/* Sources */}
                    {lesson.sources && lesson.sources.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-text-secondary tracking-widest uppercase">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {lesson.sources
                            .filter((s) => s && s !== "#")
                            .map((source, i) => (
                              <SourceTag key={i} url={source} index={i} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Quiz button */}
                    {!showQuiz && (
                      <button
                        onClick={handleGenerateQuiz}
                        className="w-full py-3 bg-surface border border-border hover:border-accent text-text-primary font-semibold rounded-xl transition-all text-sm hover:bg-accent-light hover:text-accent"
                      >
                        🧠 Test Yourself
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quiz section */}
            {showQuiz && (
              <div>
                {loadingQuiz && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-32 rounded-xl border border-border animate-shimmer bg-gradient-to-r from-card via-surface to-card bg-[length:200%_100%]"
                      />
                    ))}
                  </div>
                )}
                {quiz && !loadingQuiz && <QuizBlock quiz={quiz} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
