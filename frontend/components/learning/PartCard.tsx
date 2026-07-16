"use client";

import React, { memo } from "react";
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

const PartCardBase = ({
  part,
  isUnlocked,
  isCompleted,
  isCollapsed,
  score,
  onStartQuiz,
  onToggleCollapse,
}: Props) => {
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
          height: 56,
          borderRadius: "var(--radius-lg)",
          border: "1px solid color-mix(in srgb, var(--correct) 30%, transparent)",
          background: "var(--correct-bg)",
          color: "var(--correct)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          cursor: "pointer",
          minHeight: 48,
          fontWeight: 600,
          transition: "all 200ms var(--ease-color)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.01)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span>✓ {part.title} · Completed</span>
        <strong>{score ?? 0}/{part.quiz?.length ?? 2}</strong>
      </button>
    );
  }

  return (
    <article
      className="part-card animate-fade-up"
      aria-label={`Part ${part.partNumber}: ${part.title}`}
      style={{
        marginTop: varSpaceXl,
        borderRadius: "var(--radius-2xl)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-card)",
        boxShadow: "var(--shadow-md)",
        padding: "clamp(20px, 5vw, 36px)",
        position: "relative",
        overflow: "hidden",
        transition: "all 300ms var(--ease-color)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          height: 3,
          background: "var(--accent)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          margin: "calc(-1 * clamp(20px, 5vw, 36px)) calc(-1 * clamp(20px, 5vw, 36px)) 0",
        }}
      />
      {/* Locked-state obfuscation lives in globals.css (.part-locked-content)
          so low-end devices can swap the expensive 12px blur for a cheap fade
          via the data-perf tier. */}
      <div
        id={contentId}
        className={`part-locked-content${isUnlocked ? " is-unlocked" : ""}`}
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
                  height: 56,
                  borderRadius: "var(--radius-lg)",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: "var(--text-base)",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                  minHeight: 48,
                  transition: "all 300ms var(--ease-color)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
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
            backdropFilter: "blur(8px)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              padding: "20px 28px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-subtle)",
              textAlign: "center",
              backdropFilter: "blur(8px)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <span aria-hidden="true" style={{ display: "block", marginBottom: 12, color: "var(--text-tertiary)" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ display: "block", margin: "0 auto" }}>
                <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 10V7.8C8 5.6 9.8 4 12 4s4 1.6 4 3.8V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="15.2" r="1.4" fill="currentColor" />
              </svg>
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
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

export default memo(PartCardBase);
