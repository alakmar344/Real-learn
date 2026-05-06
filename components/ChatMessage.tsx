"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessageData } from "@/types";
import InlineQuizCheckpoint from "./InlineQuizCheckpoint";
import SourceTag from "./SourceTag";

interface ChatMessageProps {
  message: ChatMessageData;
}

function LessonRenderer({ message }: { message: ChatMessageData }) {
  const segments = message.segments ?? [];
  // How many segments are currently visible (we reveal one at a time after each quiz)
  const [visibleUpTo, setVisibleUpTo] = useState(
    segments.length > 0 ? 1 : 0
  );

  const reveal = () =>
    setVisibleUpTo((prev) => Math.min(prev + 1, segments.length));

  return (
    <div className="space-y-2">
      {segments.slice(0, visibleUpTo).map((seg, idx) => {
        if (seg.type === "text") {
          return (
            <div
              key={idx}
              className="prose prose-sm max-w-none prose-invert prose-headings:text-text-primary prose-p:text-text-secondary prose-p:leading-relaxed prose-strong:text-text-primary prose-code:text-accent prose-a:text-accent prose-li:text-text-secondary"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {seg.content ?? ""}
              </ReactMarkdown>
            </div>
          );
        }

        // Quiz segment
        if (!seg.question) return null;
        // If this is the last visible segment, show the quiz (it blocks progress)
        const isLastVisible = idx === visibleUpTo - 1;
        if (isLastVisible) {
          return (
            <InlineQuizCheckpoint
              key={idx}
              question={seg.question}
              onContinue={reveal}
            />
          );
        }
        // Already-passed quiz: show a compact "checkpoint passed" indicator
        return (
          <div
            key={idx}
            className="flex items-center gap-2 py-1 text-xs text-success opacity-60"
          >
            <span>✓</span>
            <span>Checkpoint passed</span>
          </div>
        );
      })}

      {/* Auto-reveal next text segment after a quiz is answered (handled by onContinue) */}

      {/* Sources once fully read */}
      {visibleUpTo >= segments.length &&
        message.sources &&
        message.sources.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-text-secondary tracking-widest uppercase">
              Sources
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources
                .filter((s) => s && s !== "#")
                .map((source, i) => (
                  <SourceTag key={i} url={source} index={i} />
                ))}
            </div>
          </div>
        )}
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%] bg-accent text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[90%] space-y-1">
        {/* Avatar */}
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            RL
          </div>
          <span className="text-xs text-text-secondary">RealLearn Tutor</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
          {message.type === "lesson" ? (
            <LessonRenderer message={message} />
          ) : (
            <div className="prose prose-sm max-w-none prose-invert prose-headings:text-text-primary prose-p:text-text-secondary prose-p:leading-relaxed prose-strong:text-text-primary prose-code:text-accent prose-a:text-accent prose-li:text-text-secondary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content ?? ""}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
