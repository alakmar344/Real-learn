"use client";

import { useState, useEffect } from "react";
import MicButton from "@/components/shared/MicButton";
import { usePreferenceStore } from "@/store/preferenceStore";

interface Props {
  onSubmit: (question: string) => Promise<void>;
}

// Must match the backend's MAX_QUESTION_LENGTH so an over-long follow-up is
// caught in the UI instead of bouncing off a 400 after a round trip. Voice
// transcripts append programmatically (bypassing the textarea's maxLength), so
// we also hard-clamp on every mutation.
const MAX_QUESTION_LENGTH = 1000;

export default function FollowUpBox({ onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");
  const language = usePreferenceStore((s) => s.language);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setValue(customEvent.detail.slice(0, MAX_QUESTION_LENGTH));
      }
    };
    window.addEventListener("reallearn:fillFollowUp", handler);
    return () => window.removeEventListener("reallearn:fillFollowUp", handler);
  }, []);

  const submit = async () => {
    if (!value.trim() || loading) return;
    setLoading(true);
    await onSubmit(value.trim());
    setValue("");
    setLoading(false);
  };

  return (
    <section className="followup animate-fade-up" aria-label="Ask a follow-up question">
      <p className="followup__label">Ask a follow-up and unlock a new 3-part journey.</p>
      <label htmlFor="followup-input" className="sr-only">
        Follow-up question
      </label>
      <textarea
        id="followup-input"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Still curious? Pull the thread…"
        aria-label="Follow-up question"
        maxLength={MAX_QUESTION_LENGTH}
        className="followup__textarea"
      />
      {interimSpeech ? (
        <p aria-live="polite" className="followup__listening">
          Listening — {interimSpeech}
        </p>
      ) : null}
      <div className="followup__actions">
        <MicButton
          language={language}
          onTranscript={(text) =>
            setValue((current) =>
              (current.trim() ? `${current.trim()} ${text}` : text).slice(0, MAX_QUESTION_LENGTH)
            )
          }
          onInterim={setInterimSpeech}
        />
        <button
          type="button"
          disabled={loading || !value.trim()}
          aria-busy={loading}
          aria-label="Submit follow-up question"
          onClick={submit}
          className="btn-primary"
        >
          {loading ? "Generating…" : "Teach Me More →"}
        </button>
      </div>
    </section>
  );
}
