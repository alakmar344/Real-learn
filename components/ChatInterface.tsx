"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessageData, Language, Level } from "@/types";
import ChatMessage from "./ChatMessage";

interface ChatInterfaceProps {
  level: Level;
  language: Language;
}

const SUGGESTION_CARDS = [
  {
    emoji: "🌍",
    title: "Real-World Science",
    description: "Concepts explained through today's news",
    prompt: "Teach me a science concept from today's news",
  },
  {
    emoji: "🧠",
    title: "Deep Explanations",
    description: "Complex topics made crystal clear",
    prompt: "Explain how black holes form",
  },
  {
    emoji: "📊",
    title: "Economics & Finance",
    description: "How money and markets work",
    prompt: "Teach me about supply and demand",
  },
  {
    emoji: "🧬",
    title: "Biology & Health",
    description: "Life science through real examples",
    prompt: "What is CRISPR and how does it work?",
  },
  {
    emoji: "💻",
    title: "Technology & CS",
    description: "How the digital world actually works",
    prompt: "How does the internet actually work?",
  },
  {
    emoji: "⚗️",
    title: "Physics & Chemistry",
    description: "Forces and matter made simple",
    prompt: "What is quantum entanglement?",
  },
];
// Maximum length for lesson content when summarizing for API history to avoid context bloat.
// 240 chars keeps a short excerpt (roughly 1–2 sentences) while staying token-efficient.
const MAX_HISTORY_SUMMARY_LENGTH = 240;

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[90%] space-y-1">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            RL
          </div>
          <span className="text-xs text-text-secondary">RealLearn Tutor</span>
        </div>
        <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-text-secondary animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-text-secondary animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-text-secondary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({ level, language }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const summarizeLessonForHistory = (message: ChatMessageData) => {
    const firstText = message.segments?.find(
      (seg) => seg.type === "text" && seg.content
    );
    if (!firstText?.content) return "[lesson provided]";
    const cleaned = firstText.content.replace(/\s+/g, " ").trim();
    if (!cleaned) return "[lesson provided]";
    return cleaned.length > MAX_HISTORY_SUMMARY_LENGTH
      ? `${cleaned.slice(0, MAX_HISTORY_SUMMARY_LENGTH)}…`
      : cleaned;
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setInput("");

      const userMsg: ChatMessageData = {
        id: `user-${Date.now()}`,
        role: "user",
        type: "chat",
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      // Build history for the API (text-only summaries of previous messages)
      const historyForApi = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content:
          m.role === "user"
            ? m.content ?? ""
            : m.type === "lesson"
            ? summarizeLessonForHistory(m)
            : m.content ?? "",
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: historyForApi,
            level,
            language,
          }),
        });

        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const assistantMsg: ChatMessageData = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          type: data.type === "lesson" ? "lesson" : "chat",
          content: data.message,
          segments: data.segments,
          sources: data.sources,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, level, language]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty && !loading && (
          <div className="flex flex-col px-5 pt-8 pb-4 animate-fade-in">
            {/* Brand label */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-px h-4 bg-text-secondary/30" />
              <span className="text-xs font-semibold tracking-widest uppercase text-accent">
                RealLearn AI
              </span>
            </div>

            {/* Hero headline */}
            <h1 className="text-4xl font-extrabold text-text-primary leading-tight mb-3">
              Learn anything.{" "}
              <br />
              Think{" "}
              <span className="text-accent italic font-extrabold">deeper</span>
              <span className="text-text-primary">.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-text-secondary text-base leading-relaxed mb-6 max-w-sm">
              Deep explanations with real-world clarity — for concepts that
              demand more than a quick answer.
            </p>

            {/* Horizontally scrollable suggestion cards */}
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" }}
            >
              {SUGGESTION_CARDS.map((card) => (
                <button
                  key={card.title}
                  onClick={() => sendMessage(card.prompt)}
                  className="shrink-0 w-44 snap-start text-left bg-surface border-2 border-accent/60 rounded-2xl p-4 hover:border-accent hover:shadow-md transition-all group"
                >
                  <span className="text-2xl mb-2 block">{card.emoji}</span>
                  <p className="font-bold text-text-primary text-sm leading-tight mb-1 group-hover:text-accent transition-colors">
                    {card.title}
                  </p>
                  <p className="text-text-secondary text-xs leading-snug line-clamp-2">
                    {card.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Swipe hint */}
            <p className="text-accent text-xs font-mono mt-3 flex items-center gap-1 opacity-70">
              ✨ Swipe for more ideas →
            </p>
          </div>
        )}

        {/* Conversation messages */}
        {messages.length > 0 && (
          <div className="px-3 py-3 space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {loading && <TypingIndicator />}

            {error && (
              <div className="p-3 bg-danger-light border border-danger/30 rounded-xl text-sm text-danger animate-fade-in">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Typing indicator when there are no messages yet */}
        {isEmpty && loading && (
          <div className="px-3 py-3">
            <TypingIndicator />
            <div ref={messagesEndRef} />
          </div>
        )}

        {isEmpty && !loading && <div ref={messagesEndRef} />}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border px-4 py-3 bg-surface/90 backdrop-blur-sm space-y-2">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            ✕ Clear conversation
          </button>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 focus-within:border-accent transition-colors">
          {/* Attachment icon — placeholder for future file upload feature */}
          <button
            type="button"
            className="shrink-0 text-text-secondary/50 hover:text-text-secondary transition-colors pb-0.5 cursor-default"
            aria-label="Attach (coming soon)"
            tabIndex={-1}
            disabled
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — I love a challenge..."
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none disabled:opacity-50 leading-relaxed"
            style={{ minHeight: "26px", maxHeight: "160px" }}
          />

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="shrink-0 w-9 h-9 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>

        {/* Footer disclaimer */}
        <p className="text-[10px] text-text-secondary/50 text-center tracking-wide uppercase">
          AI output may be inaccurate. Learn critically and verify important facts.
        </p>
      </div>
    </div>
  );
}
