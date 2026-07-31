"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useLessonStore } from "@/store/lessonStore";
import { getArchivedLesson } from "@/lib/lessonArchive";
import { levelInfo } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { Skeleton } from "@/components/shared/Skeleton";

interface Props {
  onStartTopic: (topic: string) => void;
}

/** A slim, distributed home strip: the day's suggested topic + a resume card,
 * with only a light-touch link to the full progress dashboard. The heavy
 * stats live on /progress, keeping the landing page calm. */
export default function HomeStats({ onStartTopic }: Props) {
  const mounted = useMounted();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const xp = useProgressStore((s) => s.xp);
  const streak = useProgressStore((s) => s.streak);

  const journeys = useSavedJourneysStore((s) => s.journeys);
  const loadJourney = useLessonStore((s) => s.loadJourney);

  if (!mounted) {
    return (
      <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
        <Skeleton height={34} width={280} borderRadius={999} />
      </div>
    );
  }

  const info = levelInfo(xp);
  // Lesson bodies live in the IndexedDB archive (the store keeps only a
  // lightweight index), so resumability is judged from the index counts and
  // the full lesson is loaded async on click.
  const inProgress = journeys.find((j) => {
    const totalParts = j.lesson?.parts?.length ?? j.partCount ?? 3;
    return (j.completedParts ?? []).length < totalParts;
  });
  const hasActivity = xp > 0 || journeys.length > 0;

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
      {/* The "Today's spark" chip used to live here — a second suggestion
          widget stacked directly under ExampleQuestions' suggestion chip,
          with heavily overlapping topics. One suggestion surface (next to
          the input, where the decision happens) beats two competing ones:
          fewer choices before the primary action (Hick's law). */}

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
            <span className="resume-card__kicker">pick up where you left off</span>
            <span className="resume-card__question">{inProgress.question}</span>
          </span>
          <span className="resume-card__cta">resume →</span>
        </button>
      )}

      {/* First visit: a quiet mental model of the product — ask, learn in
          three parts, pass each gate. Disappears once there's any activity. */}
      {!hasActivity && (
        <ol className="how-strip" aria-label="How RealLearn works">
          <li className="how-strip__step">
            <span className="how-strip__num" aria-hidden="true">1</span>
            Ask any question
          </li>
          <li className="how-strip__step">
            <span className="how-strip__num" aria-hidden="true">2</span>
            Learn it in three parts
          </li>
          <li className="how-strip__step">
            <span className="how-strip__num" aria-hidden="true">3</span>
            Pass each quiz to advance
          </li>
        </ol>
      )}

      {/* Light-touch link to the full dashboard */}
      {hasActivity && (
        <Link
          href="/progress"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text-tertiary)",
            textDecoration: "none",
          }}
        >
          <span className={streak > 0 ? "flame-flicker" : undefined} style={{ filter: streak > 0 ? "none" : "grayscale(1) opacity(0.6)" }}>🔥</span>
          <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{streak}</span>
          <span>·</span>
          <span>Level <strong style={{ color: "var(--text-secondary)" }}>{info.level}</strong></span>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>· View progress →</span>
        </Link>
      )}
    </div>
  );
}
