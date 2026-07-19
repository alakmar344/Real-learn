"use client";

import { useState } from "react";
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

  return (
    <section
      className="animate-fade-up"
      aria-label="Ask a follow-up question"
      style={{
        marginTop: varSpaceLg,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        padding: varSpaceBase,
      }}
    >
      <p style={{ marginTop: 0, marginBottom: 10, color: "var(--text-secondary)", fontSize: 13 }}>
        Ask a follow-up and unlock a new 3-part journey.
      </p>
      <label htmlFor="followup-input" style={{ display: "none" }}>
        Follow-up question
      </label>
      <textarea
        id="followup-input"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
        placeholder="Go deeper..."
        aria-label="Follow-up question"
        maxLength={MAX_QUESTION_LENGTH}
        style={{
          width: "100%",
          minHeight: 80,
          resize: "vertical",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          padding: varSpaceMd,
          fontFamily: "var(--font-inter)",
          fontSize: 14,
        }}
      />
      {interimSpeech ? (
        <p
          aria-live="polite"
          style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic" }}
        >
          Listening — {interimSpeech}
        </p>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
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
        onClick={async () => {
          if (!value.trim()) return;
          setLoading(true);
          await onSubmit(value.trim());
          setValue("");
          setLoading(false);
        }}
        style={{
          marginTop: 0,
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "10px 16px",
          fontWeight: 600,
          background: loading || !value.trim() ? "var(--border-default)" : "var(--accent)",
          color: loading || !value.trim() ? "var(--text-tertiary)" : "var(--on-accent)",
          cursor: loading || !value.trim() ? "not-allowed" : "pointer",
          fontSize: 14,
          minHeight: 44,
          transition: "background 200ms var(--ease-color)",
        }}
      >
        {loading ? "Generating..." : "Teach Me More →"}
      </button>
      </div>
    </section>
  );
}

const varSpaceMd = "var(--space-md)";
const varSpaceBase = "var(--space-base)";
const varSpaceLg = "var(--space-lg)";
