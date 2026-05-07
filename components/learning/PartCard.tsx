"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import { LessonPart } from "@/types";
import SourceTag from "@/components/shared/SourceTag";

const subjectColors: Record<string, string> = {
  Physics: "var(--subject-physics)",
  Chemistry: "var(--subject-chemistry)",
  Economics: "var(--subject-economics)",
  Biology: "var(--subject-biology)",
  CS: "var(--subject-cs)",
  History: "var(--subject-history)",
  General: "var(--subject-general)",
};

interface Props {
  part: LessonPart;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCollapsed: boolean;
  score: number | null;
  onStartQuiz: () => void;
  onToggleCollapse: () => void;
}

export default function PartCard({
  part,
  isUnlocked,
  isCompleted,
  isCollapsed,
  score,
  onStartQuiz,
  onToggleCollapse,
}: Props) {
  const timer = useReadingTimer(isUnlocked && !isCompleted);

  if (isCompleted && isCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        style={{
          marginTop: 24,
          width: "100%",
          height: 52,
          borderRadius: 12,
          border: "1px solid rgba(16,185,129,0.2)",
          background: "rgba(16,185,129,0.08)",
          color: "var(--correct)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          cursor: "pointer",
        }}
      >
        <span>✓ {part.title} · Completed</span>
        <strong>{score ?? 0}/2</strong>
      </button>
    );
  }

  return (
    <article
      className="animate-fade-up"
      style={{
        marginTop: 32,
        borderRadius: 20,
        border: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        padding: "clamp(20px, 3vw, 32px)",
        opacity: isUnlocked ? 1 : 0.4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            borderRadius: 6,
            border: "1px solid rgba(245,197,24,0.3)",
            background: "var(--gold-dim)",
            color: "var(--gold-primary)",
            padding: "4px 10px",
            fontSize: 11,
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          PART {part.partNumber}
        </span>
        <span
          style={{
            borderRadius: 6,
            border: `1px solid color-mix(in srgb, ${subjectColors[part.subject] ?? "var(--subject-general)"} 30%, transparent)`,
            background: `color-mix(in srgb, ${subjectColors[part.subject] ?? "var(--subject-general)"} 12%, transparent)`,
            color: subjectColors[part.subject] ?? "var(--subject-general)",
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {part.subject}
        </span>
      </div>

      <h2 style={{ margin: "12px 0 0", fontSize: "clamp(22px, 3vw, 26px)", fontWeight: 600 }}>
        {part.title}
      </h2>

      <div
        className="markdown-content"
        style={{
          marginTop: 20,
          fontSize: 15,
          color: "#d0d0d0",
          lineHeight: 1.85,
          maxWidth: 640,
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.content}</ReactMarkdown>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {part.sources.map((source) => (
          <SourceTag key={source} href={source} />
        ))}
      </div>

      {isUnlocked && !isCompleted ? (
        <div style={{ marginTop: 20 }}>
          {!timer.isComplete ? (
            <div style={{ height: 3, width: "100%", borderRadius: 999, background: "var(--border-subtle)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${timer.progress}%`,
                  height: "100%",
                  background: "var(--gold-primary)",
                  transition: "width 100ms linear",
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartQuiz}
              className="animate-fade-up"
              style={{
                marginTop: 4,
                width: "100%",
                height: 52,
                borderRadius: 12,
                border: "none",
                background: "var(--gold-primary)",
                color: "var(--bg-primary)",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 0 32px rgba(245,197,24,0.4)",
              }}
            >
              I&apos;ve Read This → Take Quiz
            </button>
          )}
        </div>
      ) : null}

      {isCompleted && !isCollapsed ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            marginTop: 16,
            border: "1px solid var(--border-default)",
            borderRadius: 10,
            background: "transparent",
            color: "var(--text-secondary)",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Collapse part
        </button>
      ) : null}
    </article>
  );
}
