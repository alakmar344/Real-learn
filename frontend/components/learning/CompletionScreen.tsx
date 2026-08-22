"use client";

import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { LessonJourney } from "@/types";
import ShareResult from "@/components/learning/ShareResult";
import FeedbackGate from "@/components/shared/FeedbackGate";
import QuickSummaryCards from "@/components/learning/QuickSummaryCards";
import { contentLangAttrs } from "@/lib/locale";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  lesson: LessonJourney;
  /** Sum of FIRST-ATTEMPT part scores (passing itself always ends perfect). */
  totalScore: number;
  onRestart?: () => void;
  onRetake?: () => void;
}

/** Generate contextual follow-up suggestions based on the lesson topic and takeaways. */
function generateFollowUpSuggestions(
  lesson: LessonJourney,
  t: (key: any, params?: Record<string, string | number>) => string
): string[] {
  const topic = lesson.question ?? lesson.topic ?? "";
  const takeaways = lesson.keyTakeaways ?? [];
  const suggestions: string[] = [];

  if (topic.length > 0) {
    suggestions.push(t("completion.suggestConnect", { topic: topic.slice(0, 50) }));
  }

  if (takeaways[0]) {
    const short = takeaways[0].slice(0, 70).replace(/\.$/, "");
    suggestions.push(t("completion.suggestApply", { topic: short }));
  }

  suggestions.push(t("completion.suggestMisconception"));
  return suggestions.slice(0, 3);
}

export default function CompletionScreen({ lesson, totalScore, onRestart, onRetake }: Props) {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  // Max score = the ACTUAL number of quiz questions — salvaged quizzes can
  // have 1 question, so hardcoding 2 per part made perfection unreachable.
  // Guard the denominator: an empty/salvaged lesson (no parts) would otherwise
  // yield maxScore 0 → NaN% and a NaN strokeDashoffset (broken ring).
  const maxScore = Math.max(
    1,
    (lesson.parts ?? []).reduce((sum, part) => sum + (part.quiz?.length ?? 2), 0) ||
      (lesson.parts?.length ?? 3) * 2
  );

  const pct = Math.round((totalScore / maxScore) * 100);
  const circumference = 2 * Math.PI * 42;
  const followUps = useMemo(() => generateFollowUpSuggestions(lesson, t), [lesson, t]);
  const offset = circumference - (pct / 100) * circumference;

  return (
    <section ref={sectionRef} className="completion animate-fade-up" aria-label={t("completion.journeyComplete")}>
      {/* Score ring */}
      <div className="completion__hero">
        <div className="completion__ring" aria-hidden="true">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="completion-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-bright)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#completion-ring)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              className="completion__ring-progress"
            />
          </svg>
          <div className="completion__ring-score">
            {totalScore}/{maxScore}
          </div>
        </div>

        <div>
          <h3 className="completion__title">
            {(lesson.parts?.length ?? 3) === 1 ? t("completion.gotIt") : t("completion.journeyComplete")}
          </h3>
          <p className="completion__subtitle">
            {t("completion.scored", { score: totalScore, total: maxScore })} — {pct >= 80 ? t("completion.cleanRun") : pct >= 50 ? t("completion.solid") : t("completion.tough")}
          </p>
        </div>
      </div>

      {/* Quick summary deck */}
      <QuickSummaryCards lesson={lesson} />

      {/* Suggested follow-up questions — zero cognitive load: just tap.
          Derived from the topic (not just takeaways), so fast-mode and
          salvaged lessons still get a next step instead of a dead end. */}
      {followUps.length > 0 && (
        <div>
          <p className="completion__section-label">{t("completion.whatConnectsNext")}</p>
          <div className="completion__suggests">
            {followUps.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                className="suggest-pill"
                // Pills embed model-generated topic/takeaway fragments (WCAG 3.1.2)
                {...contentLangAttrs(lesson.language)}
                onClick={() => {
                  const followUpInput = document.getElementById("followup-input");
                  if (followUpInput) {
                    // Explicit behavior overrides the CSS reduced-motion rule
                    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    followUpInput.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
                    const event = new CustomEvent("reallearn:fillFollowUp", { detail: suggestion });
                    window.dispatchEvent(event);
                    setTimeout(() => followUpInput.focus(), 500);
                    return;
                  }
                  // FollowUpBox isn't mounted — hand the suggestion to the
                  // homepage ask box via the sessionStorage draft it restores
                  // on mount, so the tap always leads somewhere.
                  try {
                    sessionStorage.setItem("reallearn_draft_question", suggestion);
                  } catch {
                    // best-effort
                  }
                  router.push("/");
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Share your result */}
      <ShareResult question={lesson.question ?? lesson.topic ?? ""} totalScore={totalScore} maxScore={maxScore} />

      {/* Optional, anonymous review — offered soon after the first lesson */}
      <FeedbackGate />

      {/* Actions */}
      <div className="completion__actions">
        {onRetake && (
          <button type="button" onClick={onRetake} className="btn-toggle">
            {t("completion.retakeQuiz")}
          </button>
        )}
        {onRestart && (
          <button type="button" onClick={onRestart} className="btn-primary">
            {t("completion.continueLearning")}
          </button>
        )}
      </div>
    </section>
  );
}
