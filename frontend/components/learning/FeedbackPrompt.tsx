"use client";

import { useState } from "react";
import { showToast } from "@/components/shared/ToastContainer";
import {
  markFeedbackGiven,
  snoozeFeedback,
} from "@/lib/feedback";

interface Props {
  /** Closes/removes the prompt from the parent (used after submit/dismiss). */
  onDone?: () => void;
}

const MAX_TEXT_LENGTH = 1000;

/**
 * Optional, non-blocking review prompt. Shown the day after a user completes
 * their first learning journey. Asks three things only:
 *   - what they liked,
 *   - what we should improve, and
 *   - a 1–10 star rating.
 *
 * Privacy: every field is submitted anonymously (see lib/feedback.ts and the
 * backend /api/feedback route). No Clerk ID, email, or IP is ever attached.
 * The prompt can be skipped or permanently dismissed — it is never forced.
 */
export default function FeedbackPrompt({ onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [likes, setLikes] = useState("");
  const [improvements, setImprovements] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stars = Array.from({ length: 10 }, (_, i) => i + 1);

  async function postReview() {
    const payload = {
      rating,
      likes: likes.trim(),
      improvements: improvements.trim(),
    };
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://real-learn.onrender.com";
    const res = await fetch(`${backendUrl}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Intentionally NO Authorization header and NO identity fields — the
      // review is anonymous by design.
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("feedback post failed");
  }

  async function handleSubmit() {
    if (rating < 1) {
      showToast("Please pick a star rating (1–10), or tap “No thanks”.", "info");
      return;
    }
    setSubmitting(true);
    try {
      await postReview();
    } catch {
      // Best-effort: even if the send fails, we still record locally that the
      // user gave feedback so we never nag them again.
    }
    markFeedbackGiven({ rating, likes: likes.trim(), improvements: improvements.trim() });
    setSubmitting(false);
    showToast("Thanks for the feedback!", "success");
    onDone?.();
  }

  function handleNoThanks() {
    markFeedbackGiven();
    onDone?.();
  }

  function handleSnooze() {
    snoozeFeedback(7);
    showToast("We'll ask another time.", "info");
    onDone?.();
  }

  const debouncedBtn: React.CSSProperties = {
    border: "none",
    borderRadius: "var(--radius-lg)",
    background: "var(--accent)",
    color: "var(--on-accent)",
    padding: "13px 26px",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    minHeight: 50,
    boxShadow: "var(--shadow-sm)",
    transition: "all 500ms var(--ease-spring)",
  };

  const ghostBtn: React.CSSProperties = {
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-lg)",
    background: "transparent",
    color: "var(--text-secondary)",
    padding: "13px 20px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    minHeight: 50,
    transition: "all 500ms var(--ease-spring)",
  };

  return (
    <section
      aria-label="Share your feedback"
      style={{
        marginTop: "var(--space-lg)",
        borderRadius: "var(--radius-2xl)",
        border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
        background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))",
        padding: "clamp(24px, 4vw, 36px)",
        position: "relative",
      }}
    >
      <h3
        style={{
          margin: "0 0 4px",
          fontSize: 20,
          fontWeight: 800,
          color: "var(--text-primary)",
        }}
      >
        How was your first lesson?
      </h3>
      <p style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-secondary)", fontSize: 14 }}>
        A quick, optional review — no account needed and nothing tied to you. Takes under a minute.
      </p>

      {/* Star rating 1–10 */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <label
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          How would you rate RealLearn? (1–10 stars)
        </label>
        <div
          role="radiogroup"
          aria-label="Star rating from 1 to 10"
          style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
          onMouseLeave={() => setHoverRating(0)}
        >
          {stars.map((n) => {
            const active = (hoverRating || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 26,
                  lineHeight: 1,
                  padding: 2,
                  color: active ? "#f5b301" : "var(--border-accent)",
                  transition: "transform 200ms var(--ease-spring), color 200ms ease",
                  transform: active ? "scale(1.12)" : "scale(1)",
                }}
              >
                ★
              </button>
            );
          })}
          {rating > 0 && (
            <span
              style={{
                marginLeft: 10,
                alignSelf: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--accent)",
              }}
            >
              {rating}/10
            </span>
          )}
        </div>
      </div>

      {/* What they like */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <label
          htmlFor="feedback-likes"
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          What did you like? <span style={{ fontWeight: 500, color: "var(--text-tertiary)" }}>(optional)</span>
        </label>
        <textarea
          id="feedback-likes"
          value={likes}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(e) => setLikes(e.target.value)}
          rows={3}
          placeholder="The explanations, the quizzes, the vibe…"
          style={{
            width: "100%",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            padding: "12px 14px",
            fontSize: 14,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* What to improve */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <label
          htmlFor="feedback-improvements"
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          What should we improve? <span style={{ fontWeight: 500, color: "var(--text-tertiary)" }}>(optional)</span>
        </label>
        <textarea
          id="feedback-improvements"
          value={improvements}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(e) => setImprovements(e.target.value)}
          rows={3}
          placeholder="Anything that felt slow, confusing, or missing…"
          style={{
            width: "100%",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            padding: "12px 14px",
            fontSize: 14,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={handleSubmit} disabled={submitting} style={debouncedBtn}>
          {submitting ? "Sending…" : "Send feedback"}
        </button>
        <button type="button" onClick={handleSnooze} disabled={submitting} style={ghostBtn}>
          Ask later
        </button>
        <button
          type="button"
          onClick={handleNoThanks}
          disabled={submitting}
          style={{ ...ghostBtn, borderColor: "transparent", color: "var(--text-tertiary)" }}
        >
          No thanks
        </button>
      </div>
    </section>
  );
}
