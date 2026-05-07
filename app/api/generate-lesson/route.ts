import { NextResponse } from "next/server";
import { callGemma, parseJSON } from "@/lib/gemma";
import { GENERATE_LESSON_PROMPT } from "@/lib/prompts";
import { LessonJourney, Level, Language } from "@/types";

function isValidJourney(data: LessonJourney | null): data is LessonJourney {
  if (!data) return false;
  if (!Array.isArray(data.parts) || data.parts.length !== 3) return false;
  if (!Array.isArray(data.keyTakeaways) || data.keyTakeaways.length !== 3) {
    return false;
  }
  return data.parts.every(
    (part, index) =>
      part.partNumber === (index + 1) &&
      typeof part.title === "string" &&
      typeof part.content === "string" &&
      Array.isArray(part.quiz) &&
      part.quiz.length === 2 &&
      part.quiz.every(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctIndex === "number"
      )
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string;
      language?: Language;
      level?: Level;
    };

    const question = body.question?.trim();
    const language = body.language ?? "English";
    const level = body.level ?? "Class 9-10";

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const userPrompt = `Question: ${question}\nLanguage: ${language}\nLevel: ${level}`;
    let raw: string;
    try {
      raw = await callGemma(GENERATE_LESSON_PROMPT, userPrompt, true, 0.6, 60000);
    } catch (error) {
      const isTimeoutError =
        error instanceof Error &&
        error.message.toLowerCase().includes("timed out");

      if (!isTimeoutError) {
        throw error;
      }

      raw = await callGemma(
        GENERATE_LESSON_PROMPT,
        userPrompt,
        false,
        0.6,
        60000
      );
    }
    const parsed = parseJSON<LessonJourney>(raw);

    if (!isValidJourney(parsed)) {
      return NextResponse.json(
        { error: "Model returned invalid lesson format" },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[generate-lesson]", error);
    return NextResponse.json(
      { error: "Failed to generate lesson" },
      { status: 500 }
    );
  }
}
