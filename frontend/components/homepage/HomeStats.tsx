"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useLessonStore } from "@/store/lessonStore";
import { getArchivedLesson } from "@/lib/lessonArchive";
import { useMounted } from "@/hooks/useMounted";
import MathText from "@/components/shared/MathText";
import { Skeleton } from "@/components/shared/Skeleton";

import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  onStartTopic: (topic: string) => void;
}

/** A quiet home strip: resume an unfinished journey or a brief "how it works"
 * for first-time visitors. Progress lives in the navbar (ProgressHub) and on
 * /progress — no duplicate links needed. */
export default function HomeStats({ onStartTopic }: Props) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const journeys = useSavedJourneysStore((s) => s.journeys);
  const loadJourney = useLessonStore((s) => s.loadJourney);

  // Reserve the strip's space pre-hydration so the resume / how-it-works card
  // fades in without shoving the ask box down (the localStorage-backed store
  // isn't readable until mounted).
  if (!mounted) {
    return (
      <div className="hero__content hero-glass-card hero__panel" aria-hidden="true">
        <div className="home-strip home-strip--skeleton">
          <Skeleton height={44} width={220} borderRadius="var(--radius-lg, 12px)" ariaLabel="" />
        </div>
      </div>
    );
  }

  // Lesson bodies live in the IndexedDB archive (the store keeps only a
  // lightweight index), so resumability is judged from the index counts and
  // the full lesson is loaded async on click.
  const inProgress = journeys.find((j) => {
    const totalParts = j.lesson?.parts?.length ?? j.partCount ?? 3;
    return (j.completedParts ?? []).length < totalParts;
  });
  const hasActivity = journeys.length > 0;

  // Returning visitors with all journeys completed don't need an empty container
  if (!inProgress && hasActivity) {
    return null;
  }

  return (
    <div className="hero__content hero-glass-card hero__panel">
      <div className="home-strip">
        {/* Resume the unfinished journey */}
        {inProgress && (
          <button
            type="button"
            onClick={async () => {
              if (!isSignedIn) {
                router.push(`/sign-in?redirect_url=${encodeURIComponent("/learn")}`);
                return;
              }
              // Free local read from the IndexedDB archive — no LLM call.
              const lesson = inProgress.lesson ?? (await getArchivedLesson(inProgress.id));
              if (lesson) {
                loadJourney({ ...inProgress, lesson });
                router.push("/learn");
                return;
              }
              // Last resort (archive copy gone): regenerate via the normal
              // question flow — usually a server-cache hit.
              onStartTopic(inProgress.question);
            }}
            className="resume-card"
          >
            <span className="resume-card__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13 4v3.5a3 3 0 0 1-3 3H3.5m0 0L6.5 7.5m-3 3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="resume-card__text">
              <span className="resume-card__kicker">{t("hero.pickUpWhereLeft")}</span>
              <span className="resume-card__question"><MathText text={inProgress.question} /></span>
            </span>
            <span className="resume-card__cta">{t("hero.resume")}</span>
          </button>
        )}

        {/* First visit: a quiet mental model of the product — ask, learn in
            three parts, pass each gate. Disappears once there's any activity. */}
        {!hasActivity && (
          <div className="home-first-visit">
            <ol className="how-strip" aria-label="How RealLearn works">
              <li className="how-strip__step">
                <span className="how-strip__num" aria-hidden="true">1</span>
                {t("hero.step1")}
              </li>
              <li className="how-strip__step">
                <span className="how-strip__num" aria-hidden="true">2</span>
                {t("hero.step2")}
              </li>
              <li className="how-strip__step">
                <span className="how-strip__num" aria-hidden="true">3</span>
                {t("hero.step3")}
              </li>
            </ol>
            <div className="trust-strip" aria-label="Trust and platform standards">
              <span className="trust-badge">
                <span className="trust-badge__dot" aria-hidden="true" />
                {t("hero.badgeLevel")}
              </span>
              <span className="trust-badge">
                <span className="trust-badge__dot" aria-hidden="true" />
                {t("hero.badgePrivate")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
