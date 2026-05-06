import { NextResponse } from "next/server";
import { callGemmaWithHistory, parseJSON } from "@/lib/gemma";
import { CHAT_TUTOR_PROMPT } from "@/lib/prompts";
import { ChatSegment, QuizQuestion } from "@/types";

const requestLog: number[] = [];
const RATE_LIMIT = 40;
const RATE_WINDOW = 60 * 1000;
// Maximum number of previous messages to include in context
const MAX_HISTORY_MESSAGES = 10;
// Maximum character length per history entry to prevent token overflow
const MAX_HISTORY_CONTENT_LENGTH = 1000;

function checkRateLimit(): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  while (requestLog.length > 0 && requestLog[0] < windowStart) {
    requestLog.shift();
  }
  if (requestLog.length >= RATE_LIMIT) return false;
  requestLog.push(now);
  return true;
}

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  type: "chat" | "lesson";
  message?: string;
  segments?: Array<{
    type: "text" | "quiz";
    content?: string;
    question?: string;
    options?: string[];
    correctIndex?: number;
    explanation?: string;
  }>;
  sources?: string[];
}

function isTeachIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const keywords = [
    "teach me",
    "explain",
    "what is",
    "what are",
    "how does",
    "how do",
    "tell me about",
    "help me understand",
    "i want to learn",
    "describe",
    "why does",
    "walk me through",
    "show me",
    "give me a lesson",
  ];
  return keywords.some((kw) => lower.includes(kw));
}

function validateSegments(raw: ChatResponse["segments"]): ChatSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && (s.type === "text" || s.type === "quiz"))
    .map((s) => {
      if (s.type === "text") {
        return { type: "text" as const, content: String(s.content || "") };
      }
      const q: QuizQuestion = {
        question: String(s.question || ""),
        options: Array.isArray(s.options)
          ? s.options.slice(0, 4).map(String)
          : ["A", "B", "C", "D"],
        correctIndex: typeof s.correctIndex === "number"
          ? Math.min(Math.max(0, s.correctIndex), 3)
          : 0,
        explanation: String(s.explanation || ""),
      };
      return { type: "quiz" as const, question: q };
    });
}

export async function POST(request: Request) {
  if (!checkRateLimit()) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const {
      message,
      history = [],
      level = "Class 9-10",
      language = "English",
    } = body as {
      message: string;
      history: HistoryEntry[];
      level: string;
      language: string;
    };

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const useSearch = isTeachIntent(message);

    // Build Gemma history: convert previous turns + add current user message
    const gemmaHistory: Array<{ role: "user" | "model"; content: string }> = [
      // Include up to last 10 messages for context, skip overly long entries
      ...history.slice(-MAX_HISTORY_MESSAGES).map((h) => ({
        role: (h.role === "assistant" ? "model" : "user") as "user" | "model",
        content: h.content.slice(0, MAX_HISTORY_CONTENT_LENGTH),
      })),
      {
        role: "user" as const,
        content: `[Level: ${level} | Language: ${language}]\n\n${message.trim()}`,
      },
    ];

    const rawResponse = await callGemmaWithHistory(
      CHAT_TUTOR_PROMPT,
      gemmaHistory,
      useSearch,
      0.7
    );

    const parsed = parseJSON<ChatResponse>(rawResponse);

    if (!parsed || !parsed.type) {
      // Fallback: treat raw response as a plain chat message
      return NextResponse.json({
        type: "chat",
        message: rawResponse.trim() || "I'm not sure how to answer that. Could you rephrase?",
      });
    }

    if (parsed.type === "chat") {
      return NextResponse.json({
        type: "chat",
        message: String(parsed.message || rawResponse.trim()),
      });
    }

    // type === "lesson"
    const segments = validateSegments(parsed.segments);
    if (segments.length === 0) {
      return NextResponse.json({
        type: "chat",
        message: rawResponse.trim(),
      });
    }

    return NextResponse.json({
      type: "lesson",
      segments,
      sources: Array.isArray(parsed.sources)
        ? parsed.sources.filter((s) => typeof s === "string")
        : [],
    });
  } catch (error) {
    console.error("[chat] Error:", error);
    return NextResponse.json(
      { error: "Failed to get a response. Please try again." },
      { status: 500 }
    );
  }
}
