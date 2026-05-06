import { NextResponse } from "next/server";
import { callGemma, parseJSON } from "@/lib/gemma";
import { Story, Concept } from "@/types";

const FOLLOW_UP_PROMPT = `You are an expert educator answering a student's follow-up question about a concept they just learned from a real news story.

The student has already read:
- The original news story
- A lesson about the concept
- Completed a quiz on it

Now they have a follow-up question. Your job:
1. Answer their specific question clearly and directly
2. Connect your answer back to the news story context where relevant
3. Use real-world grounding — search for additional examples or data if helpful
4. Keep the answer focused and educational, not overwhelming
5. Use markdown formatting for readability

Return ONLY a valid JSON object with no markdown fences:
{
  "answer": "Your markdown-formatted answer here",
  "sources": ["https://source1.com", "https://source2.com"]
}`;

const requestLog: number[] = [];
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000;

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

interface FollowUpResponse {
  answer: string;
  sources?: string[];
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
    const { story, concept, lesson, userQuestion, language } = body as {
      story: Story;
      concept: Concept;
      lesson: string;
      userQuestion: string;
      language: string;
    };

    if (!story || !concept || !userQuestion) {
      return NextResponse.json(
        { error: "Story, concept, and userQuestion are required" },
        { status: 400 }
      );
    }

    const userMessage = `THE NEWS STORY:
Headline: ${story.headline}
Summary: ${story.summary}
Category: ${story.category}
Region: ${story.region}

THE CONCEPT: ${concept.name} (${concept.subject})
Background: ${concept.teaser}

LESSON SUMMARY (first 1500 chars):
${lesson.slice(0, 1500)}

STUDENT'S FOLLOW-UP QUESTION: ${userQuestion.trim()}

Language to respond in: ${language || "English"}

Answer the student's follow-up question. Return ONLY valid JSON with no markdown fences.`;

    const rawResponse = await callGemma(
      FOLLOW_UP_PROMPT,
      userMessage,
      true,
      0.7
    );

    const result = parseJSON<FollowUpResponse>(rawResponse);

    if (!result || !result.answer) {
      // Fallback: treat raw response as the answer
      return NextResponse.json({
        answer: rawResponse.trim() || "I couldn't generate an answer. Please try rephrasing your question.",
        sources: [],
      });
    }

    return NextResponse.json({
      answer: result.answer,
      sources: Array.isArray(result.sources)
        ? result.sources.filter((s) => typeof s === "string")
        : [],
    });
  } catch (error) {
    console.error("[follow-up] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate answer. Please try again." },
      { status: 500 }
    );
  }
}
