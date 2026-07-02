"use client";

// Browser speech utilities:
// - useTextToSpeech: reads text aloud via the Web Speech API (speechSynthesis)
// - useSpeechRecognition: voice input via the Web Speech API (SpeechRecognition)
// Both degrade gracefully — `supported` is false where the APIs are missing,
// so callers can simply hide their buttons.

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

export function useTextToSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // Incremented on every speak()/stop() so stale utterance callbacks from a
  // cancelled session can't clobber the state of a newer one.
  const sessionRef = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
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

    const voices = synth.getVoices();
    const exactVoice = voices.find((v) => v.lang === lang);
    const prefixVoice = voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    const voice = exactVoice ?? prefixVoice ?? null;

    const chunks = chunkForSpeech(cleaned);
    setSpeaking(true);
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
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
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
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
      // onend fires afterwards and handles cleanup.
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
