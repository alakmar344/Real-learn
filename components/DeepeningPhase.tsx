"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Story, Concept, Lesson } from "@/types";
import SourceTag from "./SourceTag";

interface FollowUp {
  question: string;
  answer: string;
  sources: string[];
}

interface DeepeningPhaseProps {
  story: Story;
  concept: Concept;
  lesson: Lesson;
  language: string;
  onNextConcept?: () => void;
  onBack: () => void;
  hasNextConcept?: boolean;
}

export default function DeepeningPhase({
  story,
  concept,
  lesson,
  language,
  onNextConcept,
  onBack,
  hasNextConcept = false,
}: DeepeningPhaseProps) {
  const [question, setQuestion] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (followUps.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [followUps]);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    const asked = trimmed;
    setQuestion("");

    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          concept,
          lesson: lesson.lesson,
          userQuestion: asked,
          language,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFollowUps((prev) => [
        ...prev,
        {
          question: asked,
          answer: data.answer || "",
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h3 className="text-text-primary font-bold text-lg">Ask Your Own Questions</h3>
        <p className="text-text-secondary text-sm">
          What else do you want to know about <span className="text-accent">{concept.name}</span>?
        </p>
      </div>

      {/* Follow-up cards */}
      {followUps.map((fu, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-lg p-4 space-y-3 animate-fade-in"
        >
          <p className="text-xs italic text-text-secondary">
            Q: {fu.question}
          </p>
          <div className="h-px bg-border" />
          <div className="prose prose-sm max-w-none prose-headings:text-accent prose-p:text-text-secondary prose-strong:text-text-primary prose-li:text-text-secondary prose-a:text-accent">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {fu.answer}
            </ReactMarkdown>
          </div>
          {fu.sources.filter((s) => s && s !== "#").length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {fu.sources
                .filter((s) => s && s !== "#")
                .map((src, j) => (
                  <SourceTag key={j} url={src} index={j} />
                ))}
            </div>
          )}
        </div>
      ))}

      {/* Error */}
      {error && (
        <div className="p-3 bg-card border border-danger/30 rounded-lg text-sm text-danger flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto underline hover:no-underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input section */}
      <div className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          placeholder="What else do you want to know?"
          disabled={loading}
          rows={3}
          className="w-full bg-card border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent resize-vertical disabled:opacity-50 transition-colors"
        />
        <button
          onClick={handleAsk}
          disabled={!question.trim() || loading}
          className="w-full py-3 bg-accent text-black font-bold rounded-lg hover:shadow-[0_0_16px_rgba(245,197,24,0.4)] transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Thinking...
            </>
          ) : (
            "Ask →"
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 bg-card border border-border text-text-secondary text-sm font-semibold rounded-lg hover:border-accent/50 hover:text-text-primary transition-all"
        >
          ← Back to Stories
        </button>
        {hasNextConcept && onNextConcept && (
          <button
            onClick={onNextConcept}
            className="flex-1 py-2.5 bg-card border border-border text-text-secondary text-sm font-semibold rounded-lg hover:border-accent/50 hover:text-text-primary transition-all"
          >
            Next Concept →
          </button>
        )}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
