"use client";

// "Listen to this answer" — reads a piece of lesson content aloud using
// Microsoft Edge's online TTS service via the backend API.

import { markdownToPlainText, speechLangFor, useEdgeTts } from "@/hooks/useSpeech";

interface Props {
  /** The (markdown) text to read aloud. */
  text: string;
  /** App language of the content, e.g. "Hindi". Defaults to English. */
  language?: string;
  /** Accessible label when idle. */
  label?: string;
}

export default function ListenButton({ text, language, label = "Listen to this section" }: Props) {
  const { supported, speaking, loading, error, speak, stop, clearError } = useEdgeTts();

  const handleClick = () => {
    if (error) clearError();
    if (speaking) {
      stop();
    } else {
      speak(markdownToPlainText(text), speechLangFor(language));
    }
  };

  if (!supported) {
    return (
      <span
        aria-label="Read-aloud not supported in this browser"
        title="Read-aloud requires a modern browser"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-subtle)",
          background: "transparent",
          color: "var(--text-tertiary)",
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 600,
          opacity: 0.45,
          cursor: "not-allowed",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>🔊</span>
        Listen
      </span>
    );
  }

  const showError = Boolean(error);

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        aria-pressed={speaking}
        aria-label={speaking ? "Stop reading aloud" : label}
        title={showError ? `${label} — ${error}` : speaking ? "Stop reading aloud" : label}
        onClick={handleClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          borderRadius: "var(--radius-sm)",
          border: speaking ? "1px solid var(--accent)" : showError ? "1px solid var(--wrong)" : "1px solid var(--border-default)",
          background: speaking ? "var(--accent-dim)" : showError ? "rgba(185, 28, 28, 0.08)" : "transparent",
          color: speaking ? "var(--accent)" : showError ? "var(--wrong)" : "var(--text-secondary)",
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          minHeight: 32,
          transition: "all 200ms var(--ease-color)",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>
          {loading ? "⏳" : speaking ? "◼" : showError ? "⚠" : "🔊"}
        </span>
        {loading ? "Generating..." : speaking ? "Stop" : showError ? "Retry" : "Listen"}
      </button>
      {showError ? (
        <span
          role="alert"
          style={{
            fontSize: 11,
            color: "var(--wrong)",
            lineHeight: 1.3,
            maxWidth: 240,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
            title={error ?? undefined}
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
