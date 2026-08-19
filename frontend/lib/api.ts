// Shared backend API client. Centralizes backend URL handling, public
// capability discovery, and predictive cache checks so the frontend and backend
// stay tightly coupled: the UI adapts to backend config instead of hard-coding
// constants, and warm-up/cache-peek requests reuse one transport path.

import { Language, Level, LessonMode } from "@/types";
import { type LearningPreferences } from "@/lib/personalization";

export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com"
).replace(/\/$/, "");

export interface BackendCapabilities {
  ok: boolean;
  version: string;
  capabilities: {
    lessonGeneration: boolean;
    textToSpeech: boolean;
    speechToText: boolean;
    multilingual: boolean;
  };
  limits: {
    maxQuestionLength: number;
  };
  languages: string[];
  levels: string[];
  modes: string[];
  policies: {
    privacy: string;
    terms: string;
    cookies: string;
  };
  ai: {
    status: "ok" | "degraded" | "down";
    providers: Record<string, { status: string; latencyMs: number | null }>;
  };
}

export interface CacheCheckResult {
  requestId: string;
  cached: boolean;
  mode: LessonMode;
  expectedParts: number;
  keyHash: string;
  error?: string;
}

let readyPromise: Promise<BackendCapabilities | null> | null = null;

/** Fetch backend capabilities once per session. Falls back to null on error. */
export function fetchReady(): Promise<BackendCapabilities | null> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ready`, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      return (await res.json()) as BackendCapabilities;
    } catch {
      return null;
    }
  })();
  return readyPromise;
}

/** Non-blocking warmup ping to wake up sleeping backend instances. */
export function warmupBackend() {
  if (typeof window === "undefined") return;
  try {
    fetch(`${BACKEND_URL}/api/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    }).catch(() => {});
  } catch {
    // Best-effort non-blocking warmup
  }
}

export interface CacheCheckInput {
  question: string;
  language: Language;
  level: Level;
  mode: LessonMode;
  token: string | null;
  personalization?: LearningPreferences | null;
  learningContext?: string | null;
}

/**
 * Ask the backend whether this exact lesson already lives in cache. This is a
 * cheap, synchronous-feeling JSON call; if true, the UI can hint "Instant"
 * and avoid showing a long loading cinematic for a question that will return
 * immediately.
 */
export async function checkLessonCache(
  input: CacheCheckInput
): Promise<CacheCheckResult | null> {
  if (typeof window === "undefined") return null;
  const normalized = input.question.trim();
  if (!normalized) return null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (input.token) headers.Authorization = `Bearer ${input.token}`;

    const res = await fetch(`${BACKEND_URL}/api/lesson-cache-check`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        question: normalized,
        language: input.language,
        level: input.level,
        mode: input.mode,
        personalization: input.personalization ?? null,
        learningContext: input.learningContext ?? "",
      }),
    });

    if (!res.ok) return null;
    return (await res.json()) as CacheCheckResult;
  } catch {
    return null;
  }
}
