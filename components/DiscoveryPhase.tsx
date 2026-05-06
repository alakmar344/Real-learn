"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lesson } from "@/types";
import SourceTag from "./SourceTag";

interface DiscoveryPhaseProps {
  lesson: Lesson;
  onUnderstand: () => void;
}

export default function DiscoveryPhase({ lesson, onUnderstand }: DiscoveryPhaseProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Lesson content */}
      <div className="prose prose-sm max-w-none prose-headings:text-accent prose-p:text-text-secondary prose-p:leading-relaxed prose-strong:text-text-primary prose-code:text-accent prose-a:text-accent prose-li:text-text-secondary">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {lesson.lesson}
        </ReactMarkdown>
      </div>

      {/* Key Takeaway */}
      {lesson.keyTakeaway && (
        <div className="p-4 bg-card border-2 border-accent rounded-lg">
          <p className="text-xs font-semibold text-accent mb-1 tracking-widest uppercase">
            Key Takeaway
          </p>
          <p className="text-sm text-accent leading-relaxed">
            {lesson.keyTakeaway}
          </p>
        </div>
      )}

      {/* Sources */}
      {lesson.sources && lesson.sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-secondary tracking-widest uppercase">
            Sources from this story
          </p>
          <div className="flex flex-wrap gap-2">
            {lesson.sources
              .filter((s) => s && s !== "#")
              .map((source, i) => (
                <SourceTag key={i} url={source} index={i} />
              ))}
          </div>
        </div>
      )}

      {/* I Understand button */}
      <button
        onClick={onUnderstand}
        className="w-full py-3 bg-accent text-black font-bold rounded-lg hover:shadow-[0_0_16px_rgba(245,197,24,0.4)] transition-all text-sm"
      >
        ✓ I Understand — Test Me
      </button>
    </div>
  );
}
