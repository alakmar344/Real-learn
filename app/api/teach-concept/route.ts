import { NextResponse } from "next/server";
import { callGemma, parseJSON } from "@/lib/gemma";
import { TEACH_CONCEPT_PROMPT } from "@/lib/prompts";
import { Concept, Lesson, Story } from "@/types";

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
    const { story, concept, level, language } = body as {
      story: Story;
      concept: Concept;
      level: string;
      language: string;
    };

    if (!story || !concept) {
      return NextResponse.json(
        { error: "Story and concept are required" },
        { status: 400 }
      );
    }

    const userMessage = `THE NEWS STORY:
Headline: ${story.headline}
Summary: ${story.summary}
Category: ${story.category}
Region: ${story.region}

THE CONCEPT TO TEACH: ${concept.name}
Subject: ${concept.subject}
Why it's in this story: ${concept.teaser}

Student Level: ${level || "Class 9-10"}
Language: ${language || "English"}

Teach this concept THROUGH the story. Search for additional real-world examples and data to enrich the lesson. Return ONLY a valid JSON object with no markdown fences.`;

    const rawResponse = await callGemma(
      TEACH_CONCEPT_PROMPT,
      userMessage,
      true,
      0.7
    );

    const result = parseJSON<Lesson>(rawResponse);

    if (!result || !result.lesson) {
      // Generate a basic lesson from what we know
      return NextResponse.json({
        lesson: generateFallbackLesson(story, concept, level),
        keyTakeaway: concept.teaser,
        sources: [story.sourceUrl],
      } as Lesson);
    }

    return NextResponse.json({
      lesson: result.lesson,
      keyTakeaway: result.keyTakeaway || concept.teaser,
      sources: Array.isArray(result.sources)
        ? result.sources.filter((s) => typeof s === "string")
        : [story.sourceUrl],
    } as Lesson);
  } catch (error) {
    console.error("[teach-concept] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson. Please try again." },
      { status: 500 }
    );
  }
}

function generateFallbackLesson(
  story: Story,
  concept: Concept,
  level: string
): string {
  return `## ${concept.name}

**${concept.teaser}**

This concept is at the heart of what's happening in *"${story.headline}"*.

### What's Actually Happening

The story from ${story.region} reveals how **${concept.name}** operates in the real world. ${story.summary}

### The Core Idea

${concept.name} is a fundamental concept in **${concept.subject}** that explains the mechanisms driving this event. At the ${level} level, understanding this concept gives you a framework to interpret not just this story, but dozens of similar events you'll encounter throughout your life.

### Why This Matters

Every time you read a headline like this one, you're seeing ${concept.name} in action. The same principles that govern this event in ${story.region} operate in economies, ecosystems, and societies around the world.

### See It Differently

Next time you encounter a story about ${story.category}, look for ${concept.name} — it's almost certainly lurking beneath the surface.

---
*Source: [${story.sourceUrl}](${story.sourceUrl})*`;
}
