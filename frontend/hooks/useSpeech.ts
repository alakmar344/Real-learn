"use client";

// Browser speech utilities:
// - useTextToSpeech: reads text aloud via the Web Speech API (speechSynthesis)
// - useSpeechRecognition: voice input via the Web Speech API (SpeechRecognition)
// Both degrade gracefully — `supported` is false where the APIs are missing.

import { useCallback, useEffect, useRef, useState } from "react";
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

export function useEdgeTts() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && typeof Audio !== "undefined");
    return () => {
      sessionRef.current += 1;
      if (audioRef.current) {
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

  const stop = useCallback(() => {
    if (audioRef.current) {
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
  }, []);

  const speak = useCallback(async (text: string, lang: string) => {
    if (typeof window === "undefined") return;
    const session = ++sessionRef.current;
    stop();

    const cleaned = text.trim();
    if (!cleaned) return;

    setLoading(true);

    try {
      const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com").replace(/\/$/, "");
      const response = await fetch(`${backendUrl}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned, lang }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS API error: ${response.status}`);
      }

      if (sessionRef.current !== session) return;

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error("Empty audio response");
      }

      if (sessionRef.current !== session) return;

      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;

      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      setSpeaking(true);
      setLoading(false);

      audio.onended = () => {
        if (sessionRef.current === session) {
          setSpeaking(false);
        }
        if (objectUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrlRef.current = null;
        }
        audioRef.current = null;
      };

      audio.onerror = () => {
        if (sessionRef.current === session) {
          setSpeaking(false);
        }
        if (objectUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrlRef.current = null;
        }
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("[edge-tts] speak failed", error);
      setSpeaking(false);
      setLoading(false);
    }
  }, [stop]);

  return { supported, speaking, loading, speak, stop };
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
