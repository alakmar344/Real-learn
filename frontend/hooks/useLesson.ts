"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useLessonStore } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
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
const DEFAULT_GENERATE_RETRY_ATTEMPTS = 2;
const configuredGenerateRetryAttempts = Number(
  process.env.NEXT_PUBLIC_GENERATE_RETRY_ATTEMPTS
);
const GENERATE_RETRY_ATTEMPTS =
  Number.isFinite(configuredGenerateRetryAttempts) && configuredGenerateRetryAttempts > 0
    ? Math.floor(configuredGenerateRetryAttempts)
    : DEFAULT_GENERATE_RETRY_ATTEMPTS;
const DEFAULT_GENERATE_RETRY_DELAY_MS = 1500;
const configuredGenerateRetryDelayMs = Number(
  process.env.NEXT_PUBLIC_GENERATE_RETRY_DELAY_MS
);
const GENERATE_RETRY_DELAY_MS =
  Number.isFinite(configuredGenerateRetryDelayMs) && configuredGenerateRetryDelayMs > 0
    ? configuredGenerateRetryDelayMs
    : DEFAULT_GENERATE_RETRY_DELAY_MS;
const MAX_GENERATE_RETRY_DELAY_MS = 8000;
const RETRYABLE_STATUS_CODES = [408, 425, 429, 500, 502, 503, 504];

type StreamEvent = {
  event: string;
  data: string;
};

type RetryableError = Error & {
  status?: number;
};

function logLessonDebug(stage: string, details?: unknown) {
  if (details === undefined) {
    console.log(`[frontend][useLesson] ${stage}`);
    return;
  }
  console.log(`[frontend][useLesson] ${stage}`, details);
}

function parseSSEChunk(buffer: string): { events: StreamEvent[]; remainder: string } {
  const normalizedBuffer = buffer.includes("\r")
    ? buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    : buffer;
  const blocks = normalizedBuffer.split("\n\n");
  const remainder = blocks.pop() ?? "";
  const events = blocks
    .map((block) => {
      const lines = block.split("\n");
      const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => {
          const value = line.slice(5);
          return value.startsWith(" ") ? value.slice(1) : value;
        })
        .join("\n");
      if (!event || !data) return null;
      return { event, data };
    })
    .filter((value): value is StreamEvent => value !== null);
  return { events, remainder };
}

function sleep(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status?: number) {
  if (!Number.isInteger(status)) return false;
  return RETRYABLE_STATUS_CODES.includes(status as number);
}

function isLikelyNetworkTypeError(error: TypeError) {
  const normalized = error.message.toLowerCase();
  return (
    normalized.includes("fetch") ||
    normalized.includes("network") ||
    normalized.includes("load failed") ||
    normalized.includes("failed to fetch")
  );
}

function isRetryableMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("temporarily") ||
    normalized.includes("try again") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("network") ||
    normalized.includes("fetch failed") ||
    normalized.includes("unable to generate lesson") ||
    normalized.includes("server is busy") ||
    normalized.includes("connection closed")
  );
}

function isRetryableError(error: unknown, idleTimedOut: boolean) {
  if (idleTimedOut) return true;
  if (!(error instanceof Error)) return false;
  const retryableError = error as RetryableError;
  if (isRetryableStatus(retryableError.status)) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof TypeError) return isLikelyNetworkTypeError(error);
  return isRetryableMessage(error.message);
}

export function useLesson() {
  const router = useRouter();
  const { getToken } = useAuth();
  const {
    setQuestion,
    startLoading,
    setLesson,
    setError,
    resetForNextQuestion,
  } = useLessonStore();
  const language = usePreferenceStore((s) => s.language);
  const level = usePreferenceStore((s) => s.level);
  const mode = usePreferenceStore((s) => s.mode);

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
        mode,
        backendUrl: trimmedBackendUrl,
      });

      setQuestion(normalized);
      startLoading();

      if (navigate) {
        router.push("/learn");
      }

      let lastError: unknown = null;

      for (let attempt = 1; attempt <= GENERATE_RETRY_ATTEMPTS; attempt += 1) {
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

          logLessonDebug("sending POST /api/generate-lesson", { requestId, attempt });
          const token = await getToken();
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
          const response = await fetch(`${trimmedBackendUrl}/api/generate-lesson`, {
            method: "POST",
            headers,
            signal: controller.signal,
            body: JSON.stringify({
              question: normalized,
              language,
              level,
              mode,
            }),
          });
          refreshIdleTimeout();
          logLessonDebug("received initial response", {
            requestId,
            attempt,
            status: response.status,
            ok: response.ok,
            hasBody: Boolean(response.body),
          });

          if (!response.ok) {
            const errorPayload = await response.json().catch(() => null);
            logLessonDebug("non-OK response payload", { requestId, attempt, errorPayload });
            const error = new Error(errorPayload?.error || "Unable to generate lesson") as RetryableError;
            error.status = response.status;
            throw error;
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
              logLessonDebug("stream reader done", { requestId, attempt, chunkCount, totalBytes });
              break;
            }
            chunkCount += 1;
            totalBytes += value?.byteLength ?? 0;
            buffer += decoder.decode(value, { stream: true });
            refreshIdleTimeout();
            logLessonDebug("stream chunk decoded", {
              requestId,
              attempt,
              chunkCount,
              chunkBytes: value?.byteLength ?? 0,
              bufferedChars: buffer.length,
            });
            const { events, remainder } = parseSSEChunk(buffer);
            buffer = remainder;
            if (events.length > 0) {
              logLessonDebug("parsed SSE events from chunk", {
                requestId,
                attempt,
                chunkCount,
                events: events.map((entry) => entry.event),
                remainderChars: remainder.length,
              });
            }

            for (const entry of events) {
              if (entry.event === "lesson") {
                logLessonDebug("lesson event received", {
                  requestId,
                  attempt,
                  dataLength: entry.data.length,
                });
                lesson = JSON.parse(entry.data) as LessonJourney;
                continue;
              }
              if (entry.event === "ping") {
                logLessonDebug("ping event received", { requestId, attempt, ping: entry.data });
                continue;
              }
              if (entry.event === "done") {
                logLessonDebug("done event received", { requestId, attempt, payload: entry.data });
                continue;
              }
              if (entry.event === "error") {
                const payload = JSON.parse(entry.data) as { error?: string };
                logLessonDebug("error event received", { requestId, attempt, payload });
                throw new Error(payload.error || "Unable to generate lesson");
              }
              logLessonDebug("unknown SSE event received", {
                requestId,
                attempt,
                event: entry.event,
                payloadPreview: entry.data.slice(0, 120),
              });
            }
          }

          if (buffer.trim()) {
            logLessonDebug("processing residual stream buffer", {
              requestId,
              attempt,
              residualChars: buffer.length,
            });
            const { events } = parseSSEChunk(buffer + "\n\n");
            for (const entry of events) {
              if (entry.event === "lesson") {
                logLessonDebug("lesson event in residual buffer", {
                  requestId,
                  attempt,
                  dataLength: entry.data.length,
                });
                lesson = JSON.parse(entry.data) as LessonJourney;
              } else if (entry.event === "error") {
                const payload = JSON.parse(entry.data) as { error?: string };
                logLessonDebug("error event in residual buffer", { requestId, attempt, payload });
                throw new Error(payload.error || "Unable to generate lesson");
              } else {
                logLessonDebug("non-lesson residual event", {
                  requestId,
                  attempt,
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
            attempt,
            partsCount: lesson.parts?.length ?? 0,
            keyTakeaways: lesson.keyTakeaways?.length ?? 0,
          });
          setLesson(lesson);
          return;
        } catch (error) {
          lastError = error;
          const canRetry = attempt < GENERATE_RETRY_ATTEMPTS && isRetryableError(error, idleTimedOut);
          logLessonDebug("attempt failed", {
            requestId,
            attempt,
            canRetry,
            error,
          });

          if (canRetry) {
            const waitMs = Math.min(
              GENERATE_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
              MAX_GENERATE_RETRY_DELAY_MS
            );
            await sleep(waitMs);
            continue;
          }

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
            attempt,
            error,
          });
          setError(error instanceof Error ? error.message : "Failed to generate lesson");
          return;
        } finally {
          if (idleTimeoutId) {
            clearTimeout(idleTimeoutId);
          }
        }
      }

      setError(lastError instanceof Error ? lastError.message : "Failed to generate lesson");
    },
    [getToken, language, level, mode, router, setError, setLesson, setQuestion, startLoading]
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
