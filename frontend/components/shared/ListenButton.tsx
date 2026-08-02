"use client";

// "Listen to this answer" — reads a piece of lesson content aloud using
// Microsoft Edge's online TTS service via the backend API.

import { markdownToPlainText, speechLangFor, useEdgeTts } from "@/hooks/useSpeech";

function SpeakerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
      <path d="M15.5 9a4.5 4.5 0 0 1 0 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 6.5a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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
        className="listen-button listen-button--disabled"
      >
        <span aria-hidden="true" className="listen-button__icon"><SpeakerIcon /></span>
        Listen
      </span>
    );
  }

  const showError = Boolean(error);

  return (
    <span className="listen-button-group">
      <button
        type="button"
        aria-pressed={speaking}
        aria-label={speaking ? "Stop reading aloud" : label}
        title={showError ? `${label} — ${error}` : speaking ? "Stop reading aloud" : label}
        onClick={handleClick}
        className={`listen-button${speaking ? " listen-button--active" : ""}${showError ? " listen-button--error" : ""}`}
      >
        <span aria-hidden="true" className="listen-button__icon">
          {speaking ? "◼" : showError ? "!" : <SpeakerIcon />}
        </span>
        {loading ? "Generating..." : speaking ? "Stop" : showError ? "Retry" : "Listen"}
      </button>
      {showError ? (
        <span
          role="alert"
          className="listen-button__error"
          title={error ?? undefined}
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
