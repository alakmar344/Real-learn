"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useLessonStore } from "@/store/lessonStore";
import { LessonJourney } from "@/types";

export function useLesson() {
  const router = useRouter();
  const {
    language,
    level,
    setQuestion,
    startLoading,
    setLesson,
    setError,
    resetForNextQuestion,
  } = useLessonStore();

  const generateLesson = useCallback(
    async (question: string, navigate: boolean = true) => {
      const normalized = question.trim();
      if (!normalized) return;

      setQuestion(normalized);
      startLoading();

      if (navigate) {
        router.push("/learn");
      }

      try {
        const response = await fetch("/api/generate-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: normalized,
            language,
            level,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to generate lesson");
        }
        setLesson(data as LessonJourney);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to generate lesson");
      }
    },
    [language, level, router, setError, setLesson, setQuestion, startLoading]
  );

  const restart = useCallback(() => {
    resetForNextQuestion("");
    router.push("/");
  }, [resetForNextQuestion, router]);

  return {
    generateLesson,
    restart,
  };
}
