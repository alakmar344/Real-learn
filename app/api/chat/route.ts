import { NextResponse } from "next/server";
import { callGemmaWithHistory, parseJSON } from "@/lib/gemma";
import { CHAT_TUTOR_PROMPT } from "@/lib/prompts";
import { ChatSegment, QuizQuestion } from "@/types";

const requestLog: number[] = [];
const RATE_LIMIT = 40;
const RATE_WINDOW = 60 * 1000;
// Only include the most recent 10 messages to balance context vs latency within the model window.
// 10 is a conservative default for Gemma context size; adjust if larger windows are available.
const MAX_HISTORY_MESSAGES = 10;
// Trim each history entry to ~1000 chars to prevent token overflow and keep responses fast.
const MAX_HISTORY_CONTENT_LENGTH = 1000;
const DEFAULT_FALLBACK_MESSAGE = "I'm not sure how to answer that. Could you rephrase?";
const LESSON_RETRY_MESSAGE =
  "Let me explain this in a simpler way. Could you ask again in one sentence?";

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

/**
 * Pipeline filter: strip heading-level markdown (# / ## / ###) from chat
 * messages so casual replies don't look like document sections.
 * Bold, italics, and emoji are preserved.
 */
function sanitizeChatMessage(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, ""))
    .join("\n")
    .trim();
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

function isTeachIntent(lowerMessage: string): boolean {
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
  return keywords.some((kw) => lowerMessage.includes(kw));
}

function shouldUseSearch(lowerMessage: string): boolean {
  const searchKeywords = [
    "latest",
    "today",
    "current",
    "news",
    "recent",
    "right now",
    "this week",
  ];
  const hasKeyword = searchKeywords.some((kw) => lowerMessage.includes(kw));
  const currentYear = new Date().getFullYear();
  const hasYearMention = [...lowerMessage.matchAll(/\b(?:in\s+)?(20\d{2})\b/g)]
    .map((m) => Number(m[1]))
    .some((year) => year >= 2020 && year <= currentYear + 1);
  return hasKeyword || hasYearMention;
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

  options:
    Array.isArray(s.options) && s.options.length >= 4
      ? [
          String(s.options[0]),
          String(s.options[1]),
          String(s.options[2]),
          String(s.options[3]),
        ]
      : ["A", "B", "C", "D"],

  correctIndex:
    s.correctIndex === 0 ||
    s.correctIndex === 1 ||
    s.correctIndex === 2 ||
    s.correctIndex === 3
      ? s.correctIndex
      : 0,

  explanation: String(s.explanation || ""),
};
}
function buildLessonFromText(
  content: string,
  sources: string[] = []
): {
  type: "lesson";
  segments: Array<{ type: "text"; content: string }>;
  sources: string[];
} {
  return {
    type: "lesson" as const,
    segments: [{ type: "text" as const, content }],
    sources,
  };
}

function extractLessonText(parsed: ChatResponse | null, rawResponse: string): string {
  // Fallback priority: lesson text segments -> chat message field -> raw model text.
  const segmentText = Array.isArray(parsed?.segments)
    ? parsed.segments
        .filter((seg) => seg?.type === "text" && typeof seg.content === "string")
        .map((seg) => seg.content?.trim() || "")
        .filter(Boolean)
        .join("\n\n")
    : "";

  if (segmentText) return segmentText;
  if (typeof parsed?.message === "string" && parsed.message.trim()) return parsed.message.trim();
  return rawResponse.trim();
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

    const lowerMessage = message.toLowerCase();
    const isTeachRequest = isTeachIntent(lowerMessage);
    const useSearch = shouldUseSearch(lowerMessage);

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
      // Lower temperature improves JSON format stability and reduces invalid output variance.
      0.4
    );

    const parsed = parseJSON<ChatResponse>(rawResponse);

    if (!parsed || !parsed.type) {
      const fallbackText = sanitizeChatMessage(
        rawResponse.trim() || DEFAULT_FALLBACK_MESSAGE
      );
      if (isTeachRequest) {
        return NextResponse.json(buildLessonFromText(fallbackText));
      }
      return NextResponse.json({
        type: "chat",
        message: fallbackText,
      });
    }

    if (parsed.type === "chat") {
      const chatMessage = sanitizeChatMessage(String(parsed.message || rawResponse.trim()));
      if (isTeachRequest) {
        return NextResponse.json(buildLessonFromText(chatMessage));
      }
      return NextResponse.json({
        type: "chat",
        message: chatMessage,
      });
    }

    // type === "lesson"
    const segments = validateSegments(parsed.segments);
    if (segments.length === 0) {
      const fallbackText = sanitizeChatMessage(extractLessonText(parsed, rawResponse));
      if (isTeachRequest) {
        return NextResponse.json(
          buildLessonFromText(
            fallbackText || LESSON_RETRY_MESSAGE
          )
        );
      }
      return NextResponse.json({
        type: "chat",
        message: fallbackText || DEFAULT_FALLBACK_MESSAGE,
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
