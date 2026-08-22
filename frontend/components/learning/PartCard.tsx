"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@clerk/nextjs";

const REMARK_GFM_ONLY = [remarkGfm];

// Lazy-loaded MathMarkdown component: KaTeX CSS and AST transformers are only
// downloaded and parsed when a lesson contains LaTeX formulas ('$').
const MathMarkdown = dynamic(() => import("./MathMarkdown"), {
  ssr: false,
  loading: () => <span className="animate-pulse">Rendering formula...</span>,
});

import { useReadingTimer } from "@/hooks/useReadingTimer";
import { LessonPart } from "@/types";
import SourceTag from "@/components/shared/SourceTag";
import ListenButton from "@/components/shared/ListenButton";
import { Icon } from "@/components/shared/icons";
import { useLessonStore } from "@/store/lessonStore";
import { contentLangAttrs } from "@/lib/locale";
import { preloadSpeechAudio, speechLangFor, markdownToPlainText } from "@/hooks/useSpeech";

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
  "What it is and why it matters.",
  "How it works, step by step.",
  "Where you see it in real life.",
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
  isCompleted: boolean;
  isCollapsed: boolean;
  score: number | null;
  /* Handlers receive the part so the parent can pass ONE stable callback to
     every card — inline per-part closures defeated the memo() below and
     re-parsed all markdown on each page state change. */
  onStartQuiz: (part: LessonPart) => void;
  onToggleCollapse: (partNumber: number) => void;
}

const PartCardFooter = memo(function PartCardFooter({
  part,
  isCompleted,
  onStartQuiz,
}: {
  part: LessonPart;
  isCompleted: boolean;
  onStartQuiz: (part: LessonPart) => void;
}) {
  const timer = useReadingTimer(!isCompleted);
  const { getToken } = useAuth();
  const lessonLanguage = useLessonStore((s) => s.lesson?.language);
  const preloadedRef = useRef(false);

  // Predictive pre-fetch: when reading progress reaches 80% on Part 1,
  // warm the Edge TTS audio buffer in the background so "Listen" plays instantly.
  useEffect(() => {
    if (part.partNumber === 1 && timer.progress >= 80 && !preloadedRef.current) {
      preloadedRef.current = true;
      // Must mirror ListenButton's text exactly (title-prefixed) so the
      // prefetch lands on the same cache key the Listen click will read.
      void preloadSpeechAudio(
        markdownToPlainText(`${part.title}. ${part.content}`),
        speechLangFor(lessonLanguage),
        getToken
      );
    }
  }, [part.partNumber, part.title, part.content, timer.progress, lessonLanguage, getToken]);

  if (isCompleted) return null;

  // Nothing is gated anymore: the whole lesson is readable top to bottom,
  // and the quiz is an OPTIONAL self-check the reader can take whenever
  // they feel ready — before, during, or after reading.
  const hasQuiz = (part.quiz?.length ?? 0) > 0;

  return (
    <div className="part-card__footer">
      <div className="part-card__reading">
        {!timer.isComplete ? (
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
        ) : null}
        <button
          type="button"
          onClick={() => onStartQuiz(part)}
          // Empty-quiz parts advance directly (see learn/page.tsx), so
          // don't promise a quiz that will never open.
          aria-label={
            hasQuiz
              ? `Check what you learned in Part ${part.partNumber} (optional)`
              : `Mark Part ${part.partNumber} as done`
          }
          className={
            timer.isComplete
              ? "part-cta animate-fade-up"
              : "btn-toggle part-card__skip"
          }
        >
          {hasQuiz ? "Check what you learned →" : "Mark this part done →"}
        </button>
      </div>
    </div>
  );
});

const PartCardBase = ({
  part,
  isCompleted,
  isCollapsed,
  score,
  onStartQuiz,
  onToggleCollapse,
}: Props) => {
  const [copied, setCopied] = useState(false);
  const contentId = `part-${part.partNumber}-content`;
  const lessonLanguage = useLessonStore((s) => s.lesson?.language);
  const subjectColor = subjectColors[part.subject] ?? "var(--subject-general)";

  // Fast path: 95%+ of lessons contain no LaTeX formulas. Bypassing remark-math
  // and rehype-katex AST parsing saves significant CPU time and memory on mobile.
  const hasMath = useMemo(() => part.content?.includes("$") ?? false, [part.content]);

  const renderedProse = useMemo(() => {
    if (hasMath) {
      return <MathMarkdown content={part.content} components={markdownComponents} />;
    }
    return (
      <ReactMarkdown remarkPlugins={REMARK_GFM_ONLY} components={markdownComponents}>
        {part.content}
      </ReactMarkdown>
    );
  }, [part.content, hasMath]);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const handleCopyText = async () => {
    try {
      const textToCopy = `${part.title}\n\n${part.content}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      // Cancel any in-flight reset before scheduling a new one, and don't fire
      // setState after the card unmounts (navigation / collapse within 2s).
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
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
      {/* Nothing is locked anymore — every part renders fully readable.
          The `is-unlocked` class keeps the existing globals.css rules happy
          without a stylesheet change. */}
      <div id={contentId} className="part-locked-content is-unlocked">
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

        {/* Reading timer / optional self-check CTA isolated sub-component */}
        <PartCardFooter
          part={part}
          isCompleted={isCompleted}
          onStartQuiz={onStartQuiz}
        />

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
    </article>
  );
}

export default memo(PartCardBase);
