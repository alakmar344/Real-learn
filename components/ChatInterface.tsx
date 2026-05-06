"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessageData, Language, Level } from "@/types";
import ChatMessage from "./ChatMessage";

interface ChatInterfaceProps {
  level: Level;
  language: Language;
}

const SUGGESTIONS = [
  "Explain how black holes form",
  "Teach me about supply and demand",
  "What is CRISPR and how does it work?",
  "How does the internet actually work?",
  "Explain climate change simply",
  "What is quantum entanglement?",
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
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {isEmpty && !loading && (
          <div className="flex flex-col items-center justify-center h-full pt-12 pb-4 text-center animate-fade-in">
            <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center font-bold text-white text-xl mb-4">
              RL
            </div>
            <h2 className="text-text-primary font-bold text-xl mb-1">
              Ask me anything
            </h2>
            <p className="text-text-secondary text-sm mb-5 max-w-xs">
              I can explain concepts, answer questions, and give you a full
              lesson with quiz checkpoints.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-secondary hover:border-accent hover:text-accent hover:bg-accent-light/10 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

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

      {/* Input area */}
      <div className="shrink-0 border-t border-border p-2 bg-surface/80 backdrop-blur-sm">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-text-secondary hover:text-text-primary mb-2 transition-colors"
          >
            ✕ Clear conversation
          </button>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or say 'Teach me about…'"
            disabled={loading}
            className="flex-1 resize-none bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 leading-relaxed"
            style={{ minHeight: "38px", maxHeight: "160px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="shrink-0 w-9 h-9 bg-accent text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-text-secondary mt-1.5 text-center opacity-60">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
