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

/** Curated "spark" topics — a stable one per calendar day removes the
 * blank-input friction that keeps people from re-engaging. */
const DAILY_TOPICS = [
  "Why is the sky blue?",
  "How do black holes bend time?",
  "What causes inflation in an economy?",
  "How does mRNA vaccine technology work?",
  "Why do we dream?",
  "How did the pyramids get built?",
  "What is quantum entanglement?",
  "How does the stock market actually work?",
  "Why do earthquakes happen?",
  "How do neural networks learn?",
  "What makes something go viral?",
  "How does the immune system fight disease?",
  "Why is the ocean salty?",
  "How do vaccines create herd immunity?",
  "What is dark matter?",
  "How does photosynthesis power life?",
  "Why do civilizations collapse?",
  "How do airplanes stay in the air?",
  "What is compound interest?",
  "How does the brain form memories?",
];

function dayOfYear(d: Date): number {
  // Compute in UTC from calendar fields: a raw local-time delta is N×24h−1h
  // on the day after spring-forward DST, which floors to the previous day.
  const startUtc = Date.UTC(d.getFullYear(), 0, 0);
  const dateUtc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((dateUtc - startUtc) / 86_400_000);
}

interface Props {
  onStartTopic: (topic: string) => void;
}

function StreakIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="home-stats__streak-icon">
      <path
        d="M9.584 1.322C9.827 3.08 9.303 4.155 8.126 5.303C7.194 6.212 6.667 7.207 6.667 8.52C6.667 10.554 8.311 12.2 10.333 12.2C12.355 12.2 14 10.554 14 8.52C14 5.859 12.6 3.727 9.584 1.322Z"
        fill="currentColor"
      />
      <path
        d="M5.183 5.236C5.327 6.298 5.005 6.96 4.274 7.674C3.71 8.224 3.4 8.823 3.4 9.608C3.4 10.865 4.417 11.883 5.667 11.883C6.917 11.883 7.933 10.865 7.933 9.608C7.933 7.98 7.076 6.663 5.183 5.236Z"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  );
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

  if (!mounted) return <div className="home-stats-placeholder" aria-hidden="true" />;

  const info = levelInfo(xp);
  const topic = DAILY_TOPICS[dayOfYear(new Date()) % DAILY_TOPICS.length];
  // Lesson bodies live in the IndexedDB archive (the store keeps only a
  // lightweight index), so resumability is judged from the index counts and
  // the full lesson is loaded async on click.
  const inProgress = journeys.find((j) => {
    const totalParts = j.lesson?.parts?.length ?? j.partCount ?? 3;
    return (j.completedParts ?? []).length < totalParts;
  });
  const hasActivity = xp > 0 || journeys.length > 0;

  return (
    <div className="home-stats">
      {/* Today's spark — changes every day. Signed-out visitors are routed to
          sign-in instead of firing an unauthenticated lesson request that
          would bounce off the protected /learn route with an error flash. */}
      <button
        type="button"
        onClick={() => {
          if (!isSignedIn) {
            router.push(`/sign-in?redirect_url=${encodeURIComponent("/")}`);
            return;
          }
          onStartTopic(topic);
        }}
        className="chip"
        title="Start today's suggested topic"
      >
        <span className="chip__label">Today&apos;s topic</span>
        <span className="chip__value">{topic}</span>
      </button>

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
          className="rl-card home-stats__resume"
        >
          <span className="home-stats__resume-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 7L5 12L10 17M6 12H14C17.314 12 20 14.686 20 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="home-stats__resume-copy">
            <span className="home-stats__resume-label">
              Continue where you left off
            </span>
            <span className="home-stats__resume-question">
              {inProgress.question}
            </span>
          </span>
          <span className="home-stats__resume-action">Resume</span>
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
        <Link href="/progress" className="home-stats__meta">
          <span className={`home-stats__meta-streak${streak > 0 ? " home-stats__meta-streak--active" : ""}`}>
            <StreakIcon />
            <span>{streak}</span>
          </span>
          <span className="home-stats__meta-separator" aria-hidden="true" />
          <span>
            Level <strong>{info.level}</strong>
          </span>
          <span className="home-stats__meta-cta">View progress</span>
        </Link>
      )}
    </div>
  );
}
