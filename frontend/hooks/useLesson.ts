"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useLessonStore } from "@/store/lessonStore";
import { LessonJourney } from "@/types";

const trimmedBackendUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
"https://real-learn.onrender.com"
).replace(/\/$/, "");
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 120000;
const configuredStreamIdleTimeoutMs = Number(process.env.NEXT_PUBLIC_STREAM_IDLE_TIMEOUT_MS);
const STREAM_IDLE_TIMEOUT_MS =
  Number.isFinite(configuredStreamIdleTimeoutMs) && configuredStreamIdleTimeoutMs > 0
    ? configuredStreamIdleTimeoutMs
    : DEFAULT_STREAM_IDLE_TIMEOUT_MS;

type StreamEvent = {
  event: string;
  data: string;
};

function logLessonDebug(stage: string, details?: unknown) {
  if (details === undefined) {
    console.log(`[frontend][useLesson] ${stage}`);
    return;
  }
  console.log(`[frontend][useLesson] ${stage}`, details);
}

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
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (!normalized) {
        logLessonDebug("generateLesson skipped (empty question)", { requestId, question });
        return;
      }

      logLessonDebug("generateLesson started", {
        requestId,
        navigate,
        questionLength: normalized.length,
        language,
        level,
        backendUrl: trimmedBackendUrl,
      });

      setQuestion(normalized);
      startLoading();

      if (navigate) {
        router.push("/learn");
      }

      const controller = new AbortController();
      let idleTimedOut = false;
      let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        const refreshIdleTimeout = () => {
          if (idleTimeoutId) {
            clearTimeout(idleTimeoutId);
          }
          idleTimeoutId = setTimeout(() => {
            idleTimedOut = true;
            controller.abort();
          }, STREAM_IDLE_TIMEOUT_MS);
        };
        refreshIdleTimeout();

        logLessonDebug("sending POST /api/generate-lesson", { requestId });
        const response = await fetch(`${trimmedBackendUrl}/api/generate-lesson`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            question: normalized,
            language,
            level,
          }),
        });
        refreshIdleTimeout();
        logLessonDebug("received initial response", {
          requestId,
          status: response.status,
          ok: response.ok,
          hasBody: Boolean(response.body),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          logLessonDebug("non-OK response payload", { requestId, errorPayload });
          throw new Error(errorPayload?.error || "Unable to generate lesson");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream from backend");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let lesson: LessonJourney | null = null;
        let chunkCount = 0;
        let totalBytes = 0;

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            logLessonDebug("stream reader done", { requestId, chunkCount, totalBytes });
            break;
          }
          chunkCount += 1;
          totalBytes += value?.byteLength ?? 0;
          buffer += decoder.decode(value, { stream: true });
          refreshIdleTimeout();
          logLessonDebug("stream chunk decoded", {
            requestId,
            chunkCount,
            chunkBytes: value?.byteLength ?? 0,
            bufferedChars: buffer.length,
          });
          const { events, remainder } = parseSSEChunk(buffer);
          buffer = remainder;
          if (events.length > 0) {
            logLessonDebug("parsed SSE events from chunk", {
              requestId,
              chunkCount,
              events: events.map((entry) => entry.event),
              remainderChars: remainder.length,
            });
          }

          for (const entry of events) {
            if (entry.event === "lesson") {
              logLessonDebug("lesson event received", {
                requestId,
                dataLength: entry.data.length,
              });
              lesson = JSON.parse(entry.data) as LessonJourney;
              continue;
            }
            if (entry.event === "ping") {
              logLessonDebug("ping event received", { requestId, ping: entry.data });
              continue;
            }
            if (entry.event === "done") {
              logLessonDebug("done event received", { requestId, payload: entry.data });
              continue;
            }
            if (entry.event === "error") {
              const payload = JSON.parse(entry.data) as { error?: string };
              logLessonDebug("error event received", { requestId, payload });
              throw new Error(payload.error || "Unable to generate lesson");
            }
            logLessonDebug("unknown SSE event received", {
              requestId,
              event: entry.event,
              payloadPreview: entry.data.slice(0, 120),
            });
          }
        }

        // Process any residual buffer after the stream ends
        if (buffer.trim()) {
          logLessonDebug("processing residual stream buffer", {
            requestId,
            residualChars: buffer.length,
          });
          const { events } = parseSSEChunk(buffer + "\n\n");
          for (const entry of events) {
            if (entry.event === "lesson") {
              logLessonDebug("lesson event in residual buffer", {
                requestId,
                dataLength: entry.data.length,
              });
              lesson = JSON.parse(entry.data) as LessonJourney;
            } else if (entry.event === "error") {
              const payload = JSON.parse(entry.data) as { error?: string };
              logLessonDebug("error event in residual buffer", { requestId, payload });
              throw new Error(payload.error || "Unable to generate lesson");
            } else {
              logLessonDebug("non-lesson residual event", {
                requestId,
                event: entry.event,
                payloadPreview: entry.data.slice(0, 120),
              });
            }
          }
        }

        if (!lesson) {
          throw new Error("Backend closed connection before returning a lesson");
        }

        logLessonDebug("setLesson with parsed payload", {
          requestId,
          partsCount: lesson.parts?.length ?? 0,
          keyTakeaways: lesson.keyTakeaways?.length ?? 0,
        });
        setLesson(lesson);
      } catch (error) {
        if (
          idleTimedOut ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          setError(
            `Connection closed after ${Math.round(
              STREAM_IDLE_TIMEOUT_MS / 1000
            )}s without keep-alive. Please try again.`
          );
          return;
        }
        console.error("[frontend][useLesson] generateLesson failed", {
          requestId,
          error,
        });
        setError(error instanceof Error ? error.message : "Failed to generate lesson");
      } finally {
        if (idleTimeoutId) {
          clearTimeout(idleTimeoutId);
        }
      }
    },
    [language, level, router, setError, setLesson, setQuestion, startLoading]
  );

  const restart = useCallback(() => {
    logLessonDebug("restart invoked");
    resetForNextQuestion("");
    router.push("/");
  }, [resetForNextQuestion, router]);

  return {
    generateLesson,
    restart,
  };
}
