"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useLessonStore } from "@/store/lessonStore";
import { LessonJourney } from "@/types";

const trimmedBackendUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
"https://real-learn-backenf.onrender.com"
).replace(/\/$/, "");

type StreamEvent = {
  event: string;
  data: string;
};

function parseSSEChunk(buffer: string): { events: StreamEvent[]; remainder: string } {
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() ?? "";
  const events = blocks
    .map((block) => {
      const lines = block.split("\n");
      const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!event || !data) return null;
      return { event, data };
    })
    .filter((value): value is StreamEvent => value !== null);
  return { events, remainder };
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
        const response = await fetch(`${trimmedBackendUrl}/api/generate-lesson`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: normalized,
            language,
            level,
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(errorPayload?.error || "Unable to generate lesson");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream from backend");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let lesson: LessonJourney | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseSSEChunk(buffer);
          buffer = remainder;

          for (const entry of events) {
            if (entry.event === "lesson") {
              lesson = JSON.parse(entry.data) as LessonJourney;
              continue;
            }
            if (entry.event === "error") {
              const payload = JSON.parse(entry.data) as { error?: string };
              throw new Error(payload.error || "Unable to generate lesson");
            }
          }
        }

        if (!lesson) {
          throw new Error("Backend closed connection before returning a lesson");
        }

        setLesson(lesson);
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
