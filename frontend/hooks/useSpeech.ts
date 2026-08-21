"use client";

// Browser speech utilities:
// - useTextToSpeech: reads text aloud via the Web Speech API (speechSynthesis)
// - useSpeechRecognition: voice input via the Web Speech API (SpeechRecognition)
// Both degrade gracefully — `supported` is false where the APIs are missing.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BACKEND_URL } from "@/lib/api";

// The language map lives in lib/locale.ts (shared with the DOM lang/dir
// attributes on lesson content); these re-exports keep existing imports alive.
export { LANG_CODES as SPEECH_LANG_CODES, bcp47For as speechLangFor } from "@/lib/locale";

import removeMarkdown from "remove-markdown";

/** Strip markdown syntax so TTS reads clean prose instead of symbols. */
export function markdownToPlainText(markdown: string): string {
  return removeMarkdown(markdown)
    .replace(/[ \t]+/g, " ")
    .trim();
}

// The synthesized-audio blob LRU lives in lib/ttsCache so light consumers
// (e.g. the settings page's account-deletion cleanup) can clear it without
// bundling this whole speech implementation. Re-export for existing imports.
import { ttsBlobCacheGet, ttsBlobCacheSet } from "@/lib/ttsCache";
export { clearTtsCache } from "@/lib/ttsCache";

export function useEdgeTts() {
  // The backend TTS endpoint requires authentication (it drives a paid
  // external synthesis service), so every request carries the Clerk token.
  const { getToken } = useAuth();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && typeof Audio !== "undefined");
    return () => {
      sessionRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const stop = useCallback(() => {
    // Supersede the active session FIRST: the abort below rejects the in-flight
    // fetch, and clearing src fires an async `error` event on the media element.
    // Without the bump, both land in handlers whose session check still passes,
    // so a plain user "Stop" surfaced as "Audio playback failed".
    sessionRef.current += 1;
    // Abort any in-flight synthesis fetch so a superseded request can't keep
    // streaming (wasted bandwidth) or clobber a newer session's state later.
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (audioRef.current) {
      // Detach handlers before tearing down — `src=""` + load() runs the media
      // failure steps and would otherwise fire onerror.
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSpeaking(false);
    setLoading(false);
    setError(null);
  }, []);

  const cleanupAudio = useCallback((objectUrl: string) => {
    if (objectUrlRef.current === objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
    }
    if (audioRef.current && audioRef.current.src && audioRef.current.src.includes(objectUrl)) {
      // Detach handlers first: clearing src + load() runs the media failure
      // steps and fires an `error` event, which (with the session still
      // current, e.g. right after onended) showed "Audio playback failed"
      // after every successfully completed playback.
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
    }
  }, []);

  const speak = useCallback(async (text: string, lang: string) => {
    if (typeof window === "undefined") return;
    // stop() bumps sessionRef to supersede the previous session, so the new
    // session id must be taken AFTER it — otherwise every speak() would see
    // its own session as already stale.
    stop();
    const session = ++sessionRef.current;

    const cleaned = text.trim();
    if (!cleaned) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    controllerRef.current = controller;
    const timeoutMs = 45000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const cacheKey = `${lang}|${cleaned}`;
      let blob = ttsBlobCacheGet(cacheKey);

      if (!blob) {
        const backendUrl = BACKEND_URL;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        try {
          const token = await getToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {
          // Token fetch failing shouldn't crash TTS — the backend will reply
          // 401 and the normal error path below handles it.
        }
        const response = await fetch(`${backendUrl}/api/tts`, {
          method: "POST",
          headers,
          body: JSON.stringify({ text: cleaned, lang }),
          signal: controller.signal,
        });

        if (!response.ok) {
          clearTimeout(timeoutId);
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `TTS API error: ${response.status}`);
        }

        if (sessionRef.current !== session) {
          clearTimeout(timeoutId);
          return;
        }

        // Keep the watchdog armed through the BODY download too — headers can
        // arrive quickly while a stalled body would otherwise hang the button
        // on "Generating…" forever.
        blob = await response.blob();
        clearTimeout(timeoutId);
        if (!blob.size) {
          throw new Error("Empty audio response");
        }
        ttsBlobCacheSet(cacheKey, blob);
      } else {
        clearTimeout(timeoutId);
      }

      if (sessionRef.current !== session) return;

      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;

      const audio = new Audio(objectUrl);
      audio.preload = "auto";
      audioRef.current = audio;

      // Keep a watchdog armed through PLAYBACK START, not just the download:
      // play() can resolve while decoding/buffering stalls forever, which
      // previously left the button stuck on "Generating…". Cleared by the
      // `playing` event — the moment audio is actually audible.
      const PLAYBACK_START_TIMEOUT_MS = 10000;
      const playbackWatchdogId = setTimeout(() => {
        console.error("[edge-tts] playback never started", {
          blobType: blob.type,
          blobSize: blob.size,
        });
        if (sessionRef.current === session) {
          setError("Audio playback failed");
          setSpeaking(false);
          setLoading(false);
        }
        cleanupAudio(objectUrl);
      }, PLAYBACK_START_TIMEOUT_MS);

      // Loading flips off only when sound actually starts — so the
      // "Generating…" state truthfully covers fetch + decode + buffer.
      audio.addEventListener(
        "playing",
        () => {
          clearTimeout(playbackWatchdogId);
          if (sessionRef.current === session) {
            setSpeaking(true);
            setLoading(false);
          }
        },
        { once: true }
      );

      audio.onended = () => {
        clearTimeout(playbackWatchdogId);
        if (sessionRef.current === session) {
          setSpeaking(false);
        }
        cleanupAudio(objectUrl);
      };

      audio.onerror = () => {
        clearTimeout(playbackWatchdogId);
        const audioErr = audio.error ? ` media code=${audio.error.code}` : "";
        console.error("[edge-tts] audio playback error", {
          blobType: blob.type,
          blobSize: blob.size,
          audioErr,
        });
        if (sessionRef.current === session) {
          setError("Audio playback failed");
          setSpeaking(false);
          setLoading(false);
        }
        cleanupAudio(objectUrl);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playError) => {
          clearTimeout(playbackWatchdogId);
          console.error("[edge-tts] audio play() rejected", playError);
          if (sessionRef.current === session) {
            setError("Audio playback failed");
            setSpeaking(false);
            setLoading(false);
          }
          cleanupAudio(objectUrl);
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // A newer speak()/stop() superseded this session — its abort is
      // expected and must not clobber the newer session's state.
      if (sessionRef.current !== session) return;
      const message = err instanceof Error ? err.message : "Speech failed";
      console.error("[edge-tts] speak failed", message, err);
      setError(message);
      setSpeaking(false);
      setLoading(false);
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, [stop, getToken, cleanupAudio]);

  return { supported, speaking, loading, error, speak, stop, clearError };
}

interface UseSpeechRecognitionOptions {
  lang: string;
  onResult: (finalTranscript: string) => void;
}

export function useSpeechRecognition({ lang, onResult }: UseSpeechRecognitionOptions) {
  // Check support synchronously on first client render so the button never
  // flashes from hidden → visible (which also causes layout shift).
  const [supported] = useState(() => {
    if (typeof window === "undefined") return false;
    const w = window as unknown as Record<string, unknown>;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  });
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<{ abort?: () => void; stop?: () => void } | null>(null);
  const onResultRef = useRef(onResult);
  const langRef = useRef(lang);
  // "Latest ref" pattern — updated in an effect (not during render) so the
  // component stays pure under the React 19 hooks rules.
  useEffect(() => {
    onResultRef.current = onResult;
    langRef.current = lang;
  }, [onResult, lang]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop?.();
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined" || recognitionRef.current) return;
    const w = window as unknown as Record<string, new () => unknown>;
    const RecognitionCtor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      maxAlternatives: number;
      onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; [key: number]: { transcript: string } }> }) => void) | null;
      onend: (() => void) | null;
      onerror: ((event: { error?: unknown }) => void) | null;
      start: () => void;
      abort: () => void;
      stop: () => void;
    }) | undefined;
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.lang = langRef.current;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interim += result[0].transcript;
      }
      setInterimTranscript(interim);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterimTranscript("");
      if (finalTranscript.trim()) onResultRef.current(finalTranscript.trim());
    };
    recognition.onerror = (event) => {
      console.warn("[useSpeechRecognition] error", event?.error);
      // Defensive reset: `onend` normally fires after `onerror`, but on
      // engines where it doesn't, the mic button would stay stuck in the
      // "listening" state forever.
      recognitionRef.current = null;
      setListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch (error) {
      console.warn("[useSpeechRecognition] failed to start", error);
      recognitionRef.current = null;
      setListening(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interimTranscript, start, stop, toggle };
}

/** Preload speech audio in background so playback starts instantaneously on user click. */
export async function preloadSpeechAudio(
  text: string,
  lang: string,
  getToken?: () => Promise<string | null>
) {
  if (typeof window === "undefined") return;
  const cleaned = text.trim();
  if (!cleaned) return;
  const cacheKey = `${lang}|${cleaned}`;
  if (ttsBlobCacheGet(cacheKey)) return;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (getToken) {
      const token = await getToken().catch(() => null);
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BACKEND_URL}/api/tts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: cleaned, lang }),
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) {
        ttsBlobCacheSet(cacheKey, blob);
      }
    }
  } catch {
    // Best-effort non-blocking prefetch
  }
}

