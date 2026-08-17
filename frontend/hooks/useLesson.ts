"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import { useAuth } from "@clerk/nextjs";
import { useLessonStore } from "@/store/lessonStore";
import { usePreferenceStore } from "@/store/preferenceStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useProgressStore } from "@/store/progressStore";
import { LessonJourney } from "@/types";
import { type LearningPreferences } from "@/lib/personalization";
import { buildLearningContext } from "@/lib/learningProfile";

const trimmedBackendUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
"https://real-learn.onrender.com"
).replace(/\/$/, "");
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 180000;
const configuredStreamIdleTimeoutMs = Number(process.env.NEXT_PUBLIC_STREAM_IDLE_TIMEOUT_MS);
const STREAM_IDLE_TIMEOUT_MS =
  Number.isFinite(configuredStreamIdleTimeoutMs) && configuredStreamIdleTimeoutMs > 0
    ? configuredStreamIdleTimeoutMs
    : DEFAULT_STREAM_IDLE_TIMEOUT_MS;
// RELIABILITY: 5 total attempts with exponential backoff.
// Handles Render free-tier cold starts (~30-45s) and upstream inference latencies
// completely silently behind the loading cinematic.
const DEFAULT_GENERATE_RETRY_ATTEMPTS = 5;
const configuredGenerateRetryAttempts = Number(
  process.env.NEXT_PUBLIC_GENERATE_RETRY_ATTEMPTS
);
const GENERATE_RETRY_ATTEMPTS =
  Number.isFinite(configuredGenerateRetryAttempts) && configuredGenerateRetryAttempts > 0
    ? Math.floor(configuredGenerateRetryAttempts)
    : DEFAULT_GENERATE_RETRY_ATTEMPTS;
const DEFAULT_GENERATE_RETRY_DELAY_MS = 2000;
const configuredGenerateRetryDelayMs = Number(
  process.env.NEXT_PUBLIC_GENERATE_RETRY_DELAY_MS
);
const GENERATE_RETRY_DELAY_MS =
  Number.isFinite(configuredGenerateRetryDelayMs) && configuredGenerateRetryDelayMs > 0
    ? configuredGenerateRetryDelayMs
    : DEFAULT_GENERATE_RETRY_DELAY_MS;
const MAX_GENERATE_RETRY_DELAY_MS = 10000;
// 401 is retryable ONCE on cold token resolution (enforced in the retry loop,
// which also skips the backoff — token freshness, not server load);
// 429 is deliberately NOT retryable.
const RETRYABLE_STATUS_CODES = [401, 408, 425, 500, 502, 503, 504];

// Module-scoped "latest request wins" state. Only one lesson generation is
// meaningful at a time (there is a single global lesson store), so a newer
// request — or an explicit cancel — must abort the old stream and prevent its
// late result from overwriting newer state.
let activeRequestSeq = 0;
let activeController: AbortController | null = null;

export function cancelActiveLessonRequest() {
  activeRequestSeq += 1;
  activeController?.abort();
  activeController = null;
}

/** Non-blocking warmup ping to wake up sleeping Render backend instances on page load. */
export function warmupBackend() {
  if (typeof window === "undefined") return;
  try {
    fetch(`${trimmedBackendUrl}/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    }).catch(() => {});
  } catch {
    // Best-effort non-blocking warmup
  }
}

type StreamEvent = EventSourceMessage;

// Decode a network chunk. On `done`, flush the TextDecoder so a multi-byte
// UTF-8 character split across the final chunk isn't silently dropped; on
// mid-stream chunks decode incrementally (`stream: true`).
function bufferOrFinalChunk(
  decoder: TextDecoder,
  value: Uint8Array | undefined,
  done: boolean
): string {
  if (done) return decoder.decode();
  return decoder.decode(value, { stream: true });
}

type RetryableError = Error & {
  status?: number;
  retryAfterMs?: number;
};

const LESSON_DEBUG = process.env.NODE_ENV !== "production";
function logLessonDebug(stage: string, details?: unknown) {
  if (!LESSON_DEBUG) return;
  if (details === undefined) {
    console.log(`[frontend][useLesson] ${stage}`);
    return;
  }
  console.log(`[frontend][useLesson] ${stage}`, details);
}

// SSE framing is parsed by `eventsource-parser`, the well-established,
// spec-compliant SSE parser (used by the Vercel AI SDK, OpenAI SDK, etc.).
// It correctly handles `\r\n`/`\r`/`\n` line endings, multi-line `data:`
// fields, and partial frames split across chunks — replacing the hand-rolled
// splitter below. We feed decoded chunks in and drain the `data:` payloads it
// emits into a small queue the read loop consumes.
function createSSEParser() {
  const queue: EventSourceMessage[] = [];
  const parser = createParser({
    onEvent: (msg) => {
      // Per the SSE spec, frames without an `event:` field default to the
      // "message" type. Our backend always names its events, but a proxy that
      // strips the field must not silently cost us a frame — normalize and
      // let the dispatch switch shape-sniff it.
      queue.push(msg.event ? msg : { ...msg, event: "message" });
    },
  });
  return {
    feed(chunk: string) {
      parser.feed(chunk);
    },
    drain(): EventSourceMessage[] {
      const out = queue.slice();
      queue.length = 0;
      return out;
    },
  };
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

// UX: raw technical errors (stack traces, parser output, HTTP status dumps,
// network errno strings, provider names) must never reach the user. Server
// messages written for humans — moderation reasons, "try a different
// question" guidance — pass through untouched, EVEN when they happen to
// mention words like "network" or "connection"; only genuinely technical
// patterns trigger the warm, plain-language replacement.
const TECHNICAL_ERROR_PATTERNS: RegExp[] = [
  // Parser / runtime error output
  /\bJSON\.parse\b/i,
  /\bunexpected token\b/i,
  /\b(?:Syntax|Type|Reference|Range)Error\b/,
  /\bfailed to parse\b/i,
  /\bresponse format\b/i,
  // Stack-trace frames ("at fn (file.js:1:2)")
  /\bat\s+\S+\s+\(\S+:\d+:\d+\)/,
  // Network-layer failures (browser + Node phrasings, errno codes)
  /\b(?:failed to fetch|fetch failed|load failed)\b/i,
  /\bNetworkError\b/,
  /\bE(?:CONNREFUSED|CONNRESET|CONNABORTED|TIMEDOUT|PIPE|HOSTUNREACH|AI_AGAIN|NOTFOUND)\b/,
  /\bsocket hang ?up\b/i,
  /\bkeep-?alive\b/i,
  /\bAbortError\b/,
  /\baborted\b/i,
  /\btimed? ?out\b/i,
  // HTTP status dumps ("HTTP 502", "status code 503", "502 Bad Gateway", "5xx")
  /\bHTTP(?:\/[\d.]+)?\s*[45]\d\d\b/i,
  /\b(?:status(?:\s+code)?|error)[:\s]+[45]\d\d\b/i,
  /\b[45]\d\d\s+(?:bad gateway|service unavailable|gateway time-?out|internal server error|too many requests)\b/i,
  /\b[45]xx\b/i,
  // Internal fallback copy / provider names that must not leak
  /\bunable to generate lesson\b/i,
  /\bno response stream\b/i,
  /\bbackend closed connection\b/i,
  /\bgemma\b/i,
  /\bAPI error\b/i,
];

// Robustness: SSE frames arrive over an unreliable network and are produced by
// a streaming backend, so a single frame can be truncated or corrupt. An
// unguarded JSON.parse would throw a SyntaxError that unwinds out of the read
// loop and fails the WHOLE generation — even when a valid `lesson` frame was
// about to follow — and that SyntaxError's message ("Unexpected token…") would
// leak to the user as a technical error. Parse defensively instead.
function safeParseEvent<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export function humanizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!raw || TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(raw))) {
    return "We couldn't finish crafting your lesson this time — nothing's wrong on your end. Give it another try and we'll pick right back up where you left off.";
  }
  return raw;
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
  // Select the store ACTIONS individually. Actions have stable identities, so
  // these subscriptions never fire — whereas calling useLessonStore() with no
  // selector re-rendered every consumer (incl. the always-mounted Sidebar) on
  // every streaming `setProgress` tick.
  const setQuestion = useLessonStore((s) => s.setQuestion);
  const startLoading = useLessonStore((s) => s.startLoading);
  const setProgress = useLessonStore((s) => s.setProgress);
  const setLesson = useLessonStore((s) => s.setLesson);
  const setError = useLessonStore((s) => s.setError);
  const resetForNextQuestion = useLessonStore((s) => s.resetForNextQuestion);
  const language = usePreferenceStore((s) => s.language);
  const level = usePreferenceStore((s) => s.level);
  const mode = usePreferenceStore((s) => s.mode);
  const personalization = usePreferenceStore((s) => s.personalization);
  // Learning profile data stays on-device; only a tiny, topic-relevant context
  // snippet is computed per request and sent with the lesson body. Selecting the
  // raw journeys/subjects arrays here re-renders this hook only when the saved
  // history or subjects actually change — cheap and rare.
  const journeys = useSavedJourneysStore((s) => s.journeys);
  const subjectsSeen = useProgressStore((s) => s.subjectsSeen);

  const generateLesson = useCallback(
    // Returns true when a lesson was successfully generated and applied,
    // false on failure/cancellation — callers use this to gate side effects
    // (e.g. follow-up gamification counters).
    async (question: string, navigate: boolean = true): Promise<boolean> => {
      const normalized = question.trim();
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (!normalized) {
        logLessonDebug("generateLesson skipped (empty question)", { requestId, question });
        return false;
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

      // Latest request wins: abort any stream that is still in flight so its
      // late result can't overwrite this request's state.
      const mySeq = ++activeRequestSeq;
      activeController?.abort();
      activeController = null;
      const isStale = () => mySeq !== activeRequestSeq;

      setQuestion(normalized);
      startLoading();

      if (navigate) {
        router.push("/learn");
      }

      let lastError: unknown = null;
      // 401 is a token-freshness issue, not a server one: it earns exactly ONE
      // retry (attempt 2 fetches a fresh token via skipCache) with no backoff.
      let unauthorizedRetried = false;

      const prefsPayload: LearningPreferences | null =
        personalization.onboarded ? personalization : null;

      // Compute a tiny, topic-relevant learning-context snippet from the
      // on-device quiz history. null on cold start (no saved journeys) so
      // the field is simply omitted — the backend treats its absence as
      // "no profile yet" and answers generically. Hoisted OUT of the retry
      // loop: journeys can't change mid-generation, and re-tokenizing up to
      // 100 of them on every attempt was pure wasted main-thread work.
      // The learner's explicit goal is appended so the backend decision
      // engine can extract it as the highest-authority signal.
      const learningContext = buildLearningContext(
        journeys,
        subjectsSeen,
        normalized,
        prefsPayload?.goals ?? "",
        Date.now()
      );

      for (let attempt = 1; attempt <= GENERATE_RETRY_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        activeController = controller;
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
          let token: string | null = null;
          try {
            token = await getToken({ skipCache: attempt > 1 });
            if (!token && attempt === 1) {
              // Cold start: give Clerk session a tiny 350ms grace period if restoring
              await sleep(350);
              token = await getToken();
            }
          } catch {
            token = null;
          }

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
              personalization: prefsPayload,
              learningContext,
            }),
            cache: "no-store",
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
            // Honor the server's Retry-After hint instead of a blind backoff.
            const retryAfterSeconds = Number(response.headers.get("Retry-After"));
            if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
              error.retryAfterMs = retryAfterSeconds * 1000;
            }
            throw error;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response stream from backend");
          }

          const decoder = new TextDecoder();
          const sse = createSSEParser();
          let lesson: LessonJourney | null = null;
          let chunkCount = 0;
          let totalBytes = 0;

          // Handle one parsed SSE event. A corrupt lesson frame leaves
          // `lesson` null; the loop then ends with the friendly "closed
          // connection" error rather than a raw SyntaxError. Returns the
          // parsed lesson (or null) so the read loop can assign it directly —
          // assigning from inside this closure would defeat TS narrowing.
          const handleEvent = (entry: StreamEvent): LessonJourney | null => {
            if (entry.event === "lesson") {
              logLessonDebug("lesson event received", {
                requestId,
                attempt,
                dataLength: entry.data.length,
              });
              return safeParseEvent<LessonJourney>(entry.data);
            }
            if (entry.event === "progress") {
              const payload = safeParseEvent<{ stage: string; percent: number }>(entry.data);
              if (payload) {
                logLessonDebug("progress event received", { requestId, attempt, payload });
                setProgress(payload.stage, payload.percent);
              }
              return null;
            }
            if (entry.event === "ping") {
              logLessonDebug("ping event received", { requestId, attempt, ping: entry.data });
              return null;
            }
            if (entry.event === "done") {
              logLessonDebug("done event received", { requestId, attempt, payload: entry.data });
              return null;
            }
            if (entry.event === "error") {
              const payload = safeParseEvent<{ error?: string }>(entry.data);
              logLessonDebug("error event received", { requestId, attempt, payload });
              throw new Error(payload?.error || "Unable to generate lesson");
            }
            if (entry.event === "message") {
              // Unnamed frame (spec default type). Our backend always names
              // its events, but an intermediary that strips `event:` must not
              // cost us the lesson — sniff the payload for a known shape and
              // route it; otherwise ignore with a dev-only breadcrumb.
              const payload = safeParseEvent<Record<string, unknown>>(entry.data);
              if (payload && Array.isArray(payload.parts)) {
                logLessonDebug("unnamed frame routed as lesson", { requestId, attempt });
                return payload as unknown as LessonJourney;
              }
              if (
                payload &&
                typeof payload.stage === "string" &&
                typeof payload.percent === "number"
              ) {
                logLessonDebug("unnamed frame routed as progress", { requestId, attempt, payload });
                setProgress(payload.stage, payload.percent);
                return null;
              }
              if (LESSON_DEBUG) {
                console.debug("[frontend][useLesson] ignoring unnamed SSE frame", {
                  requestId,
                  attempt,
                  payloadPreview: entry.data.slice(0, 120),
                });
              }
              return null;
            }
            logLessonDebug("unknown SSE event received", {
              requestId,
              attempt,
              event: entry.event,
              payloadPreview: entry.data.slice(0, 120),
            });
            return null;
          };

          try {
            while (true) {
              const { value, done } = await reader.read();
              // Flush the decoder: a multi-byte UTF-8 character split across the
              // final network chunk is otherwise silently dropped. `eventsource-
              // parser` keeps its own cross-chunk frame state, so feeding the
              // final decode and draining yields any trailing event.
              const decoded = bufferOrFinalChunk(decoder, value, done);
              if (done) {
                logLessonDebug("stream reader done", { requestId, attempt, chunkCount, totalBytes });
                sse.feed(decoded);
                for (const entry of sse.drain()) {
                  const parsed = handleEvent(entry);
                  if (parsed) lesson = parsed;
                }
                break;
              }
              chunkCount += 1;
              totalBytes += value?.byteLength ?? 0;
              refreshIdleTimeout();
              logLessonDebug("stream chunk decoded", {
                requestId,
                attempt,
                chunkCount,
                chunkBytes: value?.byteLength ?? 0,
              });
              sse.feed(decoded);
              const events = sse.drain();
              if (events.length > 0) {
                logLessonDebug("parsed SSE events from chunk", {
                  requestId,
                  attempt,
                  chunkCount,
                  events: events.map((entry) => entry.event),
                });
              }
              for (const entry of events) {
                const parsed = handleEvent(entry);
                if (parsed) lesson = parsed;
              }
            }
          } finally {
            // Close the HTTP body on ALL exit paths: when handleEvent throws
            // (server `error` event) the loop unwinds without releasing the
            // stream, which otherwise keeps downloading during retry backoff.
            // No-op when the stream already finished normally.
            await reader.cancel().catch(() => {});
          }

          if (!lesson) {
            throw new Error("Backend closed connection before returning a lesson");
          }

          if (isStale()) {
            logLessonDebug("discarding stale lesson result", { requestId, attempt });
            return false;
          }
          logLessonDebug("setLesson with parsed payload", {
            requestId,
            attempt,
            partsCount: lesson.parts?.length ?? 0,
            keyTakeaways: lesson.keyTakeaways?.length ?? 0,
          });
          setLesson(lesson);
          return true;
        } catch (error) {
          lastError = error;
          // A newer request (or an explicit cancel) superseded this one:
          // swallow the abort silently — no retries, no error state.
          if (isStale()) {
            logLessonDebug("stale request aborted", { requestId, attempt });
            return false;
          }
          // 401 gets a single immediate retry (cold token resolution) instead
          // of the full exponential-backoff schedule — a genuinely expired
          // session must not hammer the backend for ~24s before failing.
          const isUnauthorized = (error as RetryableError)?.status === 401;
          let canRetry = attempt < GENERATE_RETRY_ATTEMPTS && isRetryableError(error, idleTimedOut);
          if (isUnauthorized) {
            canRetry = canRetry && !unauthorizedRetried;
            unauthorizedRetried = true;
          }
          logLessonDebug("attempt failed", {
            requestId,
            attempt,
            canRetry,
            error,
          });

          if (canRetry) {
            const retryAfterMs = (error as RetryableError)?.retryAfterMs;
            const waitMs = isUnauthorized
              ? 0 // token freshness, not server load — no backoff needed
              : Math.min(
                  retryAfterMs ??
                    GENERATE_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
                  MAX_GENERATE_RETRY_DELAY_MS
                );
            await sleep(waitMs);
            if (isStale()) return false;
            continue;
          }

          if (isUnauthorized) {
            setError(
              "Your session has expired, so we couldn't start this lesson. Please sign in again and re-ask your question — we'll take it from there."
            );
            return false;
          }

          if (
            idleTimedOut ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            setError(
              "This one took longer than expected and the connection dropped. Nothing's wrong on your end — try again and we'll get your lesson ready."
            );
            return false;
          }
          if (process.env.NODE_ENV !== "production") {
            console.error("[frontend][useLesson] generateLesson failed", {
              requestId,
              attempt,
              error,
            });
          }
          setError(humanizeErrorMessage(error));
          return false;
        } finally {
          if (idleTimeoutId) {
            clearTimeout(idleTimeoutId);
          }
          if (activeController === controller) {
            activeController = null;
          }
        }
      }

      if (isStale()) return false;
      setError(humanizeErrorMessage(lastError));
      return false;
    },
    [getToken, language, level, mode, personalization, journeys, subjectsSeen, router, setError, setLesson, setProgress, setQuestion, startLoading]
  );

  const restart = useCallback(() => {
    logLessonDebug("restart invoked");
    cancelActiveLessonRequest();
    resetForNextQuestion("");
    router.push("/");
  }, [resetForNextQuestion, router]);

  return {
    generateLesson,
    restart,
  };
}
