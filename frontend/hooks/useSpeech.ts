"use client";

// Browser speech utilities:
// - useTextToSpeech: reads text aloud via the Web Speech API (speechSynthesis)
// - useSpeechRecognition: voice input via the Web Speech API (SpeechRecognition)
// Both degrade gracefully — `supported` is false where the APIs are missing.

import { useCallback, useEffect, useRef, useState } from "react";
import { LRUCache } from "lru-cache";
import { useAuth } from "@clerk/nextjs";
import { Language } from "@/types";

/** BCP-47 speech codes for every supported app language. */
export const SPEECH_LANG_CODES: Record<Language, string> = {
  English: "en-IN",
  Hindi: "hi-IN",
  Gujarati: "gu-IN",
  Tamil: "ta-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
  Telugu: "te-IN",
  Kannada: "kn-IN",
  Malayalam: "ml-IN",
  Punjabi: "pa-IN",
  Urdu: "ur-IN",
  Odia: "or-IN",
};

export function speechLangFor(language?: string): string {
  return SPEECH_LANG_CODES[(language as Language) ?? "English"] ?? "en-IN";
}

/** Strip markdown syntax so TTS reads clean prose instead of symbols. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)([^*_]+)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Chrome silently stops long utterances (~15s), so we split text into short
// sentence-aligned chunks and queue them. Includes the Devanagari danda (।)
// used as a full stop in several Indian languages.
function chunkForSpeech(text: string, maxLen = 200): string[] {
  const sentences = text.match(/[^.!?।]+[.!?।]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current.trim()) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// BANDWIDTH: in-memory LRU of synthesized audio blobs. Replaying the same
// text (pause/restart, re-listening to a part) reuses the blob instead of
// re-downloading ~1 MB of MP3 from the backend. `lru-cache` enforces the
// byte budget and evicts least-recently-used entries for us.
const TTS_BLOB_CACHE_MAX_BYTES = 12 * 1024 * 1024;
const ttsBlobCache = new LRUCache<string, Blob>({
  maxSize: TTS_BLOB_CACHE_MAX_BYTES,
  sizeCalculation: (blob) => blob.size,
});
function ttsBlobCacheGet(key: string): Blob | undefined {
  return ttsBlobCache.get(key);
}
function ttsBlobCacheSet(key: string, blob: Blob): void {
  ttsBlobCache.set(key, blob);
}

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
        const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com").replace(/\/$/, "");
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
      setSpeaking(true);
      setLoading(false);

      audio.onended = () => {
        if (sessionRef.current === session) {
          setSpeaking(false);
        }
        cleanupAudio(objectUrl);
      };

      audio.onerror = () => {
        const audioErr = audio.error ? ` media code=${audio.error.code}` : "";
        console.error("[edge-tts] audio playback error", {
          blobType: blob.type,
          blobSize: blob.size,
          audioErr,
        });
        if (sessionRef.current === session) {
          setError("Audio playback failed");
          setSpeaking(false);
        }
        cleanupAudio(objectUrl);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playError) => {
          console.error("[edge-tts] audio play() rejected", playError);
          if (sessionRef.current === session) {
            setError("Audio playback failed");
            setSpeaking(false);
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
  }, [stop, getToken]);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  });
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const langRef = useRef(lang);
  langRef.current = lang;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const RecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.lang = langRef.current;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
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
