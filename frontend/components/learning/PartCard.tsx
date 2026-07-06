"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import { LessonPart } from "@/types";
import SourceTag from "@/components/shared/SourceTag";
import ListenButton from "@/components/shared/ListenButton";
import { useLessonStore } from "@/store/lessonStore";

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
  const contentId = `part-${part.partNumber}-content`;
  const lessonLanguage = useLessonStore((s) => s.lesson?.language);

  /* ── Collapsed completed state ── */
  if (isCompleted && isCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={false}
        aria-controls={contentId}
        style={{
          marginTop: varSpaceLg,
          width: "100%",
          height: 52,
          borderRadius: "var(--radius-md)",
          border: "1px solid color-mix(in srgb, var(--correct) 30%, transparent)",
          background: "var(--correct-bg)",
          color: "var(--correct)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        <span>✓ {part.title} · Completed</span>
        <strong>{score ?? 0}/{part.quiz?.length ?? 2}</strong>
      </button>
    );
  }

  return (
    <article
      className="animate-fade-up"
      aria-label={`Part ${part.partNumber}: ${part.title}`}
      style={{
        marginTop: varSpaceXl,
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-card)",
        boxShadow: "var(--shadow-md)",
        padding: "clamp(16px, 4vw, 32px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          height: 3,
          background: "var(--accent-gradient)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          margin: "calc(-1 * clamp(16px, 4vw, 32px)) calc(-1 * clamp(16px, 4vw, 32px)) 0",
        }}
      />
      <div
        id={contentId}
        style={{
          filter: isUnlocked ? "none" : "blur(12px)",
          pointerEvents: isUnlocked ? "auto" : "none",
          userSelect: isUnlocked ? "auto" : "none",
          opacity: isUnlocked ? 1 : 0.4,
          transition: "all 400ms ease",
        }}
      >
        {/* Part badge + subject */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-accent)",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              padding: "4px 10px",
              fontSize: 11,
              letterSpacing: "0.12em",
              fontWeight: 600,
            }}
          >
            PART {part.partNumber}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                borderRadius: "var(--radius-sm)",
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
            {isUnlocked ? (
              <ListenButton
                text={`${part.title}. ${part.content}`}
                language={lessonLanguage}
                label={`Listen to Part ${part.partNumber}`}
              />
            ) : null}
          </div>
        </div>

        <h2 style={{ margin: "12px 0 0", fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 600, fontFamily: "var(--font-playfair)" }}>
          {part.title}
        </h2>

        <div
          className="markdown-content"
          style={{
            marginTop: 20,
            fontSize: "var(--text-base)",
            color: "var(--text-secondary)",
            lineHeight: 1.9,
            maxWidth: 640,
            fontFamily: "var(--font-lora)",
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.content}</ReactMarkdown>
        </div>

        <div style={{ marginTop: varSpaceBase, display: "flex", flexWrap: "wrap", gap: varSpaceSm }}>
          {(part.sources ?? []).map((source) => (
            <SourceTag key={source} href={source} />
          ))}
        </div>

        {/* Reading timer / Quiz button */}
        {isUnlocked && !isCompleted ? (
          <div style={{ marginTop: 20 }}>
            {!timer.isComplete ? (
              <div
                role="progressbar"
                aria-valuenow={Math.round(timer.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Reading progress – please read the content before taking the quiz"
                style={{ height: 3, width: "100%", borderRadius: 999, background: "var(--border-subtle)", overflow: "hidden" }}
              >
                <div
                  style={{
                    width: `${timer.progress}%`,
                    height: "100%",
                    background: "var(--accent)",
                    transition: "width 100ms linear",
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartQuiz}
                aria-label={`Take quiz for Part ${part.partNumber}`}
                className="animate-fade-up"
                style={{
                  marginTop: 4,
                  width: "100%",
                  height: 52,
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: "var(--text-base)",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "var(--shadow-glow-accent)",
                  minHeight: 44,
                }}
              >
                I&apos;ve Read This → Take Quiz
              </button>
            )}
          </div>
        ) : null}

        {/* Collapse completed part */}
        {isCompleted && !isCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={true}
            aria-controls={contentId}
            style={{
              marginTop: varSpaceBase,
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--text-secondary)",
              padding: "8px 12px",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Collapse part
          </button>
        ) : null}
      </div>

      {/* Locked overlay */}
      {!isUnlocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-glass)",
            backdropFilter: "blur(6px)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              padding: "16px 24px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-default)",
              textAlign: "center",
              backdropFilter: "blur(4px)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 32, marginBottom: 8, display: "block" }}>🔒</span>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
              Part {part.partNumber} Locked
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
              Complete Part {part.partNumber - 1} quiz to unlock
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

/* Design-token spacing helpers (avoid magic numbers) */
const varSpaceSm = "var(--space-sm)";
const varSpaceBase = "var(--space-base)";
const varSpaceLg = "var(--space-lg)";
const varSpaceXl = "var(--space-xl)";
