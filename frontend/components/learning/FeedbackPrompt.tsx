import { useCallback, useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { showToast } from "@/components/shared/ToastContainer";
import {
  markFeedbackGiven,
  snoozeFeedback,
} from "@/lib/feedback";
import { starColor } from "@/lib/palette";
import { Icon } from "@/components/shared/icons";
import { BACKEND_URL } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  /** Closes/removes the prompt from the parent (used after submit/dismiss). */
  onDone?: () => void;
}

const MAX_TEXT_LENGTH = 1000;

export default function FeedbackPrompt({ onDone }: Props) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [likes, setLikes] = useState("");
  const [improvements, setImprovements] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const stars = Array.from({ length: 10 }, (_, i) => i + 1);

  async function postReview() {
    const payload = {
      rating,
      likes: likes.trim(),
      improvements: improvements.trim(),
    };
    const backendUrl = BACKEND_URL;
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
      showToast(t("feedback.pickRating"), "info");
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
    showToast(t("feedback.thankYou"), "success");
    onDone?.();
  }

  function handleNoThanks() {
    markFeedbackGiven();
    onDone?.();
  }

  const handleSnooze = useCallback(() => {
    snoozeFeedback(7);
    showToast(t("feedback.snoozed"), "info");
    onDone?.();
  }, [onDone, t]);

  // Escape = snooze. Capture + stopPropagation so shell-level Escape handlers
  // (sidebar close, shortcuts overlay) don't also fire underneath.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      handleSnooze();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [handleSnooze]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("feedback.modalTitle")}
      className="modal-scrim modal-scrim--top modal-scrim--high"
      onClick={handleSnooze}
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="modal-glass-surface feedback-modal animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn-icon feedback-modal__close"
          aria-label={t("feedback.askLater")}
          onClick={handleSnooze}
        >
          <Icon name="close" size={16} />
        </button>

        <h3 className="feedback-modal__title">{t("feedback.modalTitle")}</h3>
        <p className="feedback-modal__sub">
          {t("feedback.modalSub")}
        </p>

        {/* Star rating 1–10 */}
        <div className="feedback-modal__field">
          <label className="feedback-modal__label">
            {t("feedback.rateLabel")}
          </label>
          <div
            role="radiogroup"
            aria-label={t("feedback.rateLabel")}
            className="feedback-modal__stars"
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
                  className={`feedback-star${active ? " is-active" : ""}`}
                  // Star color comes from lib/palette.ts (the JS-side token
                  // source) — genuinely dynamic, so inline is correct here.
                  style={active ? { color: starColor() } : undefined}
                >
                  <Icon name={active ? "star-solid" : "star"} size={28} />
                </button>
              );
            })}
            {rating > 0 && (
              <span className="feedback-modal__score">{rating}/10</span>
            )}
          </div>
        </div>

        {/* What they like */}
        <div className="feedback-modal__field">
          <label htmlFor="feedback-likes" className="feedback-modal__label">
            {t("feedback.likeLabel")} <span className="feedback-modal__optional">{t("feedback.optional")}</span>
          </label>
          <textarea
            id="feedback-likes"
            value={likes}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(e) => setLikes(e.target.value)}
            rows={3}
            placeholder={t("feedback.likePlaceholder")}
            className="glass-textarea"
          />
        </div>

        {/* What to improve */}
        <div className="feedback-modal__field">
          <label htmlFor="feedback-improvements" className="feedback-modal__label">
            {t("feedback.improveLabel")} <span className="feedback-modal__optional">{t("feedback.optional")}</span>
          </label>
          <textarea
            id="feedback-improvements"
            value={improvements}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(e) => setImprovements(e.target.value)}
            rows={3}
            placeholder={t("feedback.improvePlaceholder")}
            className="glass-textarea"
          />
        </div>

        <div className="feedback-modal__actions">
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? t("feedback.sending") : t("feedback.send")}
          </button>
          <button type="button" onClick={handleSnooze} disabled={submitting} className="btn-ghost">
            {t("feedback.askLater")}
          </button>
          <button
            type="button"
            onClick={handleNoThanks}
            disabled={submitting}
            className="btn-ghost feedback-modal__quiet"
          >
            {t("feedback.noThanks")}
          </button>
        </div>
      </div>
    </div>
  );
}
