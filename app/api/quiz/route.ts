import { NextResponse } from "next/server";
import { callGemma, parseJSON } from "@/lib/gemma";
import { QUIZ_PROMPT } from "@/lib/prompts";
import { Concept, Quiz } from "@/types";

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

export async function POST(request: Request) {
  if (!checkRateLimit()) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { concept, lesson, level } = body as {
      concept: Concept;
      lesson: string;
      level: string;
    };

    if (!concept || !lesson) {
      return NextResponse.json(
        { error: "Concept and lesson are required" },
        { status: 400 }
      );
    }

    const userMessage = `THE CONCEPT: ${concept.name} (${concept.subject})

THE LESSON CONTENT:
${lesson.slice(0, 3000)}

Student Level: ${level || "Class 9-10"}

Generate exactly 3 MCQ questions. Questions must reference specific elements from the lesson and test real understanding. Return ONLY a valid JSON object with no markdown fences.`;

    const rawResponse = await callGemma(
      QUIZ_PROMPT,
      userMessage,
      false,
      0.6
    );

    const result = parseJSON<Quiz>(rawResponse);

    if (!result || !result.questions || !Array.isArray(result.questions)) {
      return NextResponse.json(getFallbackQuiz(concept));
    }

    const validQuestions = result.questions
      .filter(
        (q) =>
          q &&
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctIndex === "number" &&
          typeof q.explanation === "string"
      )
      .map((q) => ({
        question: q.question,
        options: q.options.slice(0, 4) as string[],
        correctIndex: Math.min(Math.max(0, q.correctIndex), 3),
        explanation: q.explanation,
      }))
      .slice(0, 3);

    if (validQuestions.length === 0) {
      return NextResponse.json(getFallbackQuiz(concept));
    }

    return NextResponse.json({ questions: validQuestions });
  } catch (error) {
    console.error("[quiz] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz. Please try again." },
      { status: 500 }
    );
  }
}

function getFallbackQuiz(concept: Concept): Quiz {
  return {
    questions: [
      {
        question: `What is the core principle of ${concept.name} in ${concept.subject}?`,
        options: [
          `It describes how systems reach equilibrium`,
          `It explains the relationship between cause and effect in complex systems`,
          `It models the transfer of energy between different states`,
          `It quantifies the rate of change in dynamic systems`,
        ],
        correctIndex: 1,
        explanation: `${concept.name} fundamentally explains how causes produce effects in ${concept.subject}, which is exactly what we see in this real-world example.`,
      },
      {
        question: `How does ${concept.name} apply to real-world scenarios like the one in this story?`,
        options: [
          `It only applies in laboratory conditions`,
          `It applies only in developed countries`,
          `It operates in all similar situations globally`,
          `It requires special conditions to manifest`,
        ],
        correctIndex: 2,
        explanation: `${concept.name} is a universal principle in ${concept.subject} that operates across all similar situations — which is why understanding it helps you read news differently.`,
      },
      {
        question: `Which factor most significantly influences the outcome when ${concept.name} is at play?`,
        options: [
          `The scale and intensity of the initial conditions`,
          `The geographic location where it occurs`,
          `The political decisions of government officials`,
          `Random chance and unpredictable events`,
        ],
        correctIndex: 0,
        explanation: `In ${concept.subject}, the initial conditions and their scale are the most critical determinants of how ${concept.name} unfolds — as this news story clearly demonstrates.`,
      },
    ],
  };
}
