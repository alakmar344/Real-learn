"use client";

import { useState } from "react";

interface Props {
  onSubmit: (question: string) => Promise<void>;
}

export default function FollowUpBox({ onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <section
      className="animate-fade-up"
      style={{
        marginTop: 24,
        borderRadius: 16,
        border: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        padding: 16,
      }}
    >
      <p style={{ marginTop: 0, marginBottom: 10, color: "var(--text-secondary)", fontSize: 13 }}>
        Ask a follow-up and unlock a new 3-part journey.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Go deeper..."
        style={{
          width: "100%",
          minHeight: 80,
          resize: "vertical",
          borderRadius: 12,
          border: "1px solid var(--border-default)",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          padding: 12,
          outline: "none",
        }}
      />
      <button
        type="button"
        disabled={loading || !value.trim()}
        onClick={async () => {
          if (!value.trim()) return;
          setLoading(true);
          await onSubmit(value.trim());
          setValue("");
          setLoading(false);
        }}
        style={{
          marginTop: 10,
          border: "none",
          borderRadius: 10,
          padding: "10px 16px",
          fontWeight: 600,
          background: "var(--gold-primary)",
          color: "var(--bg-primary)",
          cursor: "pointer",
        }}
      >
        {loading ? "Generating..." : "Teach Me More →"}
      </button>
    </section>
  );
}
