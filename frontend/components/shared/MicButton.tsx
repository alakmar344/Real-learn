"use client";

// Voice-input mic button backed by the browser's speech recognition
// (Web Speech API). Renders nothing when the browser doesn't support it.

import { useEffect, useRef } from "react";
import { speechLangFor, useSpeechRecognition } from "@/hooks/useSpeech";

interface Props {
  /** App language to listen in, e.g. "Hindi". Defaults to English. */
  language?: string;
  /** Called with the final transcript once the user stops talking. */
  onTranscript: (text: string) => void;
  /** Optional live interim transcript consumer (e.g. a hint line). */
  onInterim?: (text: string) => void;
  size?: number;
}

export default function MicButton({ language, onTranscript, onInterim, size = 40 }: Props) {
  const { supported, listening, interimTranscript, toggle } = useSpeechRecognition({
    lang: speechLangFor(language),
    onResult: onTranscript,
  });

  const onInterimRef = useRef(onInterim);
  onInterimRef.current = onInterim;
  useEffect(() => {
    onInterimRef.current?.(listening ? interimTranscript : "");
  }, [listening, interimTranscript]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? "Stop voice input" : "Ask with your voice"}
      title={listening ? "Stop voice input" : "Ask with your voice"}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        border: listening ? "1.5px solid #dc2626" : "1px solid var(--border-default)",
        background: listening ? "rgba(220,38,38,0.12)" : "transparent",
        color: listening ? "#dc2626" : "var(--text-secondary)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 200ms var(--ease-color)",
        boxShadow: listening ? "0 0 0 4px rgba(220,38,38,0.12)" : "none",
      }}
    >
      <svg
        aria-hidden="true"
        width={Math.round(size * 0.45)}
        height={Math.round(size * 0.45)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
    </button>
  );
}
