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

  if (!mounted) return <div style={{ height: 8 }} aria-hidden="true" />;

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
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
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
        className="interactive-press glow-accent"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          maxWidth: "100%",
          border: "1px dashed var(--border-default)",
          background: "transparent",
          borderRadius: 999,
          padding: "10px 20px",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: 13,
        }}
        title="Start today's suggested topic"
      >
        <span style={{ color: "var(--text-tertiary)" }}>Today&apos;s spark:</span>
        <span style={{ fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {topic}
        </span>
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 460,
            width: "100%",
            textAlign: "left",
            border: "1px solid var(--border-default)",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            padding: "12px 18px",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            position: "relative",
            overflow: "hidden",
          }}
          className="interactive-lift texture-noise"
        >
          <span style={{ fontSize: 20 }}>↩️</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600 }}>
              Continue where you left off
            </span>
            <span
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {inProgress.question}
            </span>
          </span>
          <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>Resume →</span>
        </button>
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
