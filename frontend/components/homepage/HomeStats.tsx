"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/store/progressStore";
import { useSavedJourneysStore } from "@/store/savedJourneysStore";
import { useLessonStore } from "@/store/lessonStore";
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
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
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

  const xp = useProgressStore((s) => s.xp);
  const streak = useProgressStore((s) => s.streak);

  const journeys = useSavedJourneysStore((s) => s.journeys);
  const loadJourney = useLessonStore((s) => s.loadJourney);

  if (!mounted) return <div style={{ height: 8 }} aria-hidden="true" />;

  const info = levelInfo(xp);
  const topic = DAILY_TOPICS[dayOfYear(new Date()) % DAILY_TOPICS.length];
  const inProgress = journeys.find((j) => (j.completedParts ?? [1, 2, 3]).length < 3);
  const hasActivity = xp > 0 || journeys.length > 0;

  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      {/* Today's spark — changes every day */}
      <button
        type="button"
        onClick={() => onStartTopic(topic)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          maxWidth: "100%",
          border: "1px dashed var(--border-default)",
          background: "transparent",
          borderRadius: 999,
          padding: "9px 18px",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: 13,
        }}
        title="Start today's suggested topic"
      >
        <span style={{ fontSize: 15 }}>✨</span>
        <span style={{ color: "var(--text-tertiary)" }}>Today&apos;s spark:</span>
        <span style={{ fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {topic}
        </span>
      </button>

      {/* Resume the unfinished journey */}
      {inProgress && (
        <button
          type="button"
          onClick={() => {
            loadJourney(inProgress);
            router.push("/learn");
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
            padding: "10px 14px",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
          }}
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
