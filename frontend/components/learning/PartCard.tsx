"use client";

import React, { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Hoisted to module scope so their identity is stable across renders — new
// array literals each render defeat react-markdown's internal memoization and
// force a full markdown+KaTeX re-parse on every parent re-render.
const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];
import { useReadingTimer } from "@/hooks/useReadingTimer";
import { LessonPart } from "@/types";
import SourceTag from "@/components/shared/SourceTag";
import ListenButton from "@/components/shared/ListenButton";
import { Icon } from "@/components/shared/icons";
import { useLessonStore } from "@/store/lessonStore";
import { contentLangAttrs } from "@/lib/locale";

// Security: links inside AI-generated markdown are untrusted. react-markdown's
// default urlTransform already strips javascript:/data: schemes; this override
// additionally opens links in a new tab with an opener-safe rel so a linked
// page can never reach back into the app via window.opener (and the learner
// never loses their in-progress lesson to a same-tab navigation).
const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

const subjectColors: Record<string, string> = {
  Physics: "var(--subject-physics)",
  Chemistry: "var(--subject-chemistry)",
  Economics: "var(--subject-economics)",
  Biology: "var(--subject-biology)",
  CS: "var(--subject-cs)",
  History: "var(--subject-history)",
  General: "var(--subject-general)",
};

const PART_INTENT = [
  "The core idea, built from first intuition.",
  "How it actually works, step by step.",
  "Where it shows up in the real world right now.",
];

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

interface Props {
  part: LessonPart;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCollapsed: boolean;
  score: number | null;
  /* Handlers receive the part so the parent can pass ONE stable callback to
     every card — inline per-part closures defeated the memo() below and
     re-parsed all markdown on each page state change. */
  onStartQuiz: (part: LessonPart) => void;
  onToggleCollapse: (partNumber: number) => void;
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
  const [copied, setCopied] = useState(false);
  const timer = useReadingTimer(isUnlocked && !isCompleted);
  const contentId = `part-${part.partNumber}-content`;
  const lessonLanguage = useLessonStore((s) => s.lesson?.language);
  const subjectColor = subjectColors[part.subject] ?? "var(--subject-general)";

  // The reading timer re-renders this card ~50× while the learner reads. Memoize
  // the rendered prose on `part.content` alone so those ticks don't re-parse
  // markdown and re-run KaTeX on every frame.
  const renderedProse = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={markdownComponents}
      >
        {part.content}
      </ReactMarkdown>
    ),
    [part.content]
  );

  const handleCopyText = async () => {
    try {
      const textToCopy = `${part.title}\n\n${part.content}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Best-effort copy
    }
  };

  /* ── Collapsed completed state ── */
  if (isCompleted && isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => onToggleCollapse(part.partNumber)}
        aria-expanded={false}
        aria-controls={contentId}
        className="part-done-bar"
        style={{ marginTop: "var(--space-lg)" }}
      >
        <span>
          <Icon name="check" size={14} style={{ verticalAlign: "-2px" }} /> {part.title} · Completed
        </span>
        <strong>{score ?? 0}/{part.quiz?.length ?? 2}</strong>
      </button>
    );
  }

  return (
    <article
      className="part-card animate-fade-up"
      aria-label={`Part ${part.partNumber}: ${part.title}`}
      id={`part-${part.partNumber}`}
    >
      <span className="part-card__num" aria-hidden="true">
        {String(part.partNumber).padStart(2, "0")}
      </span>

      {/* Locked-state obfuscation lives in globals.css (.part-locked-content)
          so low-end devices can swap the expensive 12px blur for a cheap fade
          via the data-perf tier. */}
      <div
        id={contentId}
        className={`part-locked-content${isUnlocked ? " is-unlocked" : ""}`}
      >
        <div className="part-card__meta">
          <div className="part-card__meta-left">
            <span className="part-card__tag">Part {part.partNumber}</span>
            <span
              className="part-card__tag part-card__tag--subject"
              style={{ "--part-subject": subjectColor } as React.CSSProperties}
            >
              <span className="part-card__tag-dot" aria-hidden="true" />
              {part.subject}
            </span>
          </div>
          {isUnlocked ? (
            <div className="part-card__meta-right">
              <button
                type="button"
                onClick={handleCopyText}
                title="Copy section text"
                aria-label="Copy section text"
                className={`part-card__tool${copied ? " is-active" : ""}`}
              >
                {copied ? <Icon name="check" size={14} /> : <CopyIcon />}
                {copied ? "Copied" : "Copy"}
              </button>
              <ListenButton
                text={`${part.title}. ${part.content}`}
                language={lessonLanguage}
                label={`Listen to Part ${part.partNumber}`}
              />
            </div>
          ) : null}
        </div>

        <h2 className="part-card__title" {...contentLangAttrs(lessonLanguage)}>
          {part.title}
        </h2>

        {/* Intent line — tells the learner what this part's JOB is
            (structural, honest) rather than pretending to summarize content
            it hasn't read. */}
        <p className="part-card__intent">
          {PART_INTENT[part.partNumber - 1] ?? PART_INTENT[0]}
        </p>

        {/* lang/dir so screen readers voice generated prose in the lesson
            language (WCAG 3.1.2) — UI chrome around it stays English. */}
        <div className="markdown-content part-card__prose" {...contentLangAttrs(lessonLanguage)}>
          {renderedProse}
        </div>

        {(part.sources ?? []).length > 0 ? (
          <div className="part-card__sources">
            {(part.sources ?? []).map((source) => (
              <SourceTag key={source} href={source} />
            ))}
          </div>
        ) : null}

        {/* Reading timer / quiz CTA */}
        {isUnlocked && !isCompleted ? (
          <div className="part-card__footer">
            {!timer.isComplete ? (
              <div className="part-card__reading">
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(timer.progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Reading progress"
                  className="part-card__reading-track"
                >
                  <div className="part-card__reading-fill" style={{ width: `${timer.progress}%` }} />
                </div>
                {/* The forward path is ALWAYS visible. While the reading timer
                    runs it's a quiet capsule; once the timer completes it
                    upgrades to the filled gradient CTA below. */}
                <button
                  type="button"
                  onClick={() => onStartQuiz(part)}
                  className="btn-toggle part-card__skip animate-fade-up"
                  aria-label={`Skip reading and take quiz for Part ${part.partNumber}`}
                >
                  I already know this → Take quiz
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStartQuiz(part)}
                // Empty-quiz parts advance directly (see learn/page.tsx), so
                // don't promise a quiz that will never open.
                aria-label={
                  (part.quiz?.length ?? 0) === 0
                    ? `Continue past Part ${part.partNumber}`
                    : `Take quiz for Part ${part.partNumber}`
                }
                className="part-cta animate-fade-up"
              >
                {(part.quiz?.length ?? 0) === 0
                  ? "I've Read This → Continue"
                  : "I've Read This → Take Quiz"}
              </button>
            )}
          </div>
        ) : null}

        {/* Collapse completed part */}
        {isCompleted && !isCollapsed ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(part.partNumber)}
            aria-expanded={true}
            aria-controls={contentId}
            className="btn-toggle"
            style={{ marginTop: "var(--space-base)" }}
          >
            Collapse part
          </button>
        ) : null}
      </div>

      {/* Locked veil */}
      {!isUnlocked && (
        <div className="part-card__veil">
          <div className="part-card__lock">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="10.5" width="14" height="9.5" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 10V7.8C8 5.6 9.8 4 12 4s4 1.6 4 3.8V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="15.2" r="1.4" fill="currentColor" />
            </svg>
            <span>
              <strong>Part {part.partNumber} locked</strong>
              Pass the Part {part.partNumber - 1} check to unlock
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

export default memo(PartCardBase);
