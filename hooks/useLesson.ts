"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useLessonStore } from "@/store/lessonStore";
import { LessonJourney } from "@/types";

const FALLBACK_ERROR = "Unable to generate lesson";
const MAX_ERROR_MESSAGE_LENGTH = 200;

function normalizeServerErrorMessage(rawMessage: string) {
  const firstLine = rawMessage.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (!firstLine || firstLine.startsWith("<")) {
    return FALLBACK_ERROR;
  }
  return firstLine.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function getApiErrorMessage(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }
  return null;
}

function isLessonJourney(data: unknown): data is LessonJourney {
  if (!data || typeof data !== "object") return false;

  const value = data as {
    question?: unknown;
    parts?: unknown;
    keyTakeaways?: unknown;
  };

  if (typeof value.question !== "string") return false;
  if (!Array.isArray(value.parts) || value.parts.length !== 3) return false;
  if (!Array.isArray(value.keyTakeaways) || value.keyTakeaways.length !== 3) {
    return false;
  }

  return (
    value.parts.every(
      (part, index) =>
        !!part &&
        typeof part === "object" &&
        "partNumber" in part &&
        part.partNumber === index + 1 &&
        "title" in part &&
        typeof part.title === "string" &&
        "content" in part &&
        typeof part.content === "string" &&
        "quiz" in part &&
        Array.isArray(part.quiz)
    ) &&
    value.keyTakeaways.every((takeaway) => typeof takeaway === "string")
  );
}

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

        const contentType = response.headers.get("content-type") ?? "";
        const isJson = contentType.includes("application/json");

        if (!isJson) {
          const text = await response.text();
          throw new Error(normalizeServerErrorMessage(text));
        }

        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getApiErrorMessage(data) ?? FALLBACK_ERROR);
        }
        if (!isLessonJourney(data)) {
          throw new Error("Received invalid lesson data");
        }
        setLesson(data);
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
