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

/**
 * Score a SpeechSynthesisVoice by how natural / high-quality it sounds.
 * Higher = better. Heuristics tuned for Chrome, Edge, Safari desktop.
 */
function scoreVoice(voice: SpeechSynthesisVoice, targetLang: string): number {
  let score = 0;
  const name = voice.name.toLowerCase();
  const lang = voice.lang;

  // Exact language match beats prefix match.
  if (lang === targetLang) score += 30;
  else if (lang.startsWith(targetLang.split("-")[0])) score += 10;

  // Premium / neural voice providers — these sound dramatically more human.
  if (name.includes("google")) score += 25;          // Google neural voices (Chrome)
  if (name.includes("microsoft")) score += 20;       // Microsoft Edge natural voices
  if (name.includes("apple")) score += 18;           // Apple enhanced / Siri voices (Safari)
  if (name.includes("natural")) score += 15;
  if (name.includes("neural")) score += 15;
  if (name.includes("enhanced")) score += 12;
  if (name.includes("premium")) score += 12;
  if (name.includes("wavenet")) score += 20;
  if (name.includes("journey")) score += 18;         // Google Journey voices
  if (name.includes("studio")) score += 16;          // Google Studio voices

  // Penalize obviously low-quality voices.
  if (name.includes("compact")) score -= 10;
  if (name.includes("basic")) score -= 8;

  return score;
}

function pickBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const langBase = lang.split("-")[0];
  // Only consider voices that match the target language (exact or prefix).
  const candidates = voices.filter(
    (v) => v.lang === lang || v.lang.startsWith(langBase),
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, v) =>
    scoreVoice(v, lang) > scoreVoice(best, lang) ? v : best,
  );
}

export function useTextToSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const sessionRef = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    // Pre-load voices (Chrome loads them asynchronously).
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => {
      sessionRef.current += 1;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, lang: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const session = ++sessionRef.current;
    synth.cancel();

    const cleaned = text.trim();
    if (!cleaned) return;

    const voice = pickBestVoice(synth.getVoices(), lang);

    const chunks = chunkForSpeech(cleaned);
    setSpeaking(true);
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      // Slightly slower rate + subtle pitch lift makes speech sound far more
      // human compared to the default flat robot voice at rate 1.
      utterance.rate = 0.88;
      utterance.pitch = 1.04;
      utterance.onerror = () => {
        if (sessionRef.current === session) setSpeaking(false);
      };
      if (index === chunks.length - 1) {
        utterance.onend = () => {
          if (sessionRef.current === session) setSpeaking(false);
        };
      }
      synth.speak(utterance);
    });
  }, []);

  return { supported, speaking, speak, stop };
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
