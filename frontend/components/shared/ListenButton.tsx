"use client";

// "Listen to this answer" — reads a piece of lesson content aloud using the
// browser's built-in text-to-speech (Web Speech API). Renders nothing when the
// browser doesn't support speech synthesis.

import { markdownToPlainText, speechLangFor, useTextToSpeech } from "@/hooks/useSpeech";

interface Props {
  /** The (markdown) text to read aloud. */
  text: string;
  /** App language of the content, e.g. "Hindi". Defaults to English. */
  language?: string;
  /** Accessible label when idle. */
  label?: string;
}

export default function ListenButton({ text, language, label = "Listen to this section" }: Props) {
  const { supported, speaking, speak, stop } = useTextToSpeech();

  if (!supported) return null;

  return (
    <button
      type="button"
      aria-pressed={speaking}
      aria-label={speaking ? "Stop reading aloud" : label}
      title={speaking ? "Stop reading aloud" : label}
      onClick={() => {
        if (speaking) {
          stop();
        } else {
          speak(markdownToPlainText(text), speechLangFor(language));
        }
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: "var(--radius-sm)",
        border: speaking ? "1px solid var(--accent)" : "1px solid var(--border-default)",
        background: speaking ? "var(--accent-dim)" : "transparent",
        color: speaking ? "var(--accent)" : "var(--text-secondary)",
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        minHeight: 32,
        transition: "all 200ms var(--ease-color)",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>
        {speaking ? "◼" : "🔊"}
      </span>
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
