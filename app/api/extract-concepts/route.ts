import { NextResponse } from "next/server";
import { callGemma, parseJSON } from "@/lib/gemma";
import { CONCEPT_EXTRACT_PROMPT } from "@/lib/prompts";
import { Concept, Story } from "@/types";

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
    const { story, level, language } = body as {
      story: Story;
      level: string;
      language: string;
    };

    if (!story || !story.headline) {
      return NextResponse.json(
        { error: "Story is required" },
        { status: 400 }
      );
    }

    const userMessage = `Here is the news story:

HEADLINE: ${story.headline}
SUMMARY: ${story.summary}
CATEGORY: ${story.category}
REGION: ${story.region}

Student Level: ${level || "Class 9-10"}
Language for concept names: ${language || "English"}

Extract 3-5 hidden academic concepts that are genuinely embedded in this story. Return ONLY a valid JSON object with no markdown fences.`;

    const rawResponse = await callGemma(
      CONCEPT_EXTRACT_PROMPT,
      userMessage,
      true,
      0.6
    );

    const result = parseJSON<{ concepts: Concept[] }>(rawResponse);

    if (!result || !result.concepts || !Array.isArray(result.concepts)) {
      return NextResponse.json({
        concepts: getFallbackConcepts(story),
      });
    }

    const validConcepts = result.concepts
      .filter(
        (c) =>
          c &&
          typeof c.name === "string" &&
          typeof c.subject === "string" &&
          typeof c.teaser === "string"
      )
      .map((c, i) => ({
        id: c.id || `concept-${i}-${Date.now()}`,
        name: c.name,
        subject: c.subject,
        difficulty: (["Easy", "Medium", "Hard"].includes(c.difficulty)
          ? c.difficulty
          : "Medium") as "Easy" | "Medium" | "Hard",
        teaser: c.teaser,
      }))
      .slice(0, 5);

    return NextResponse.json({ concepts: validConcepts });
  } catch (error) {
    console.error("[extract-concepts] Error:", error);
    return NextResponse.json(
      { error: "Failed to extract concepts. Please try again." },
      { status: 500 }
    );
  }
}

function getFallbackConcepts(story: Story): Concept[] {
  const categoryConceptMap: Record<string, Concept[]> = {
    "Science & Space": [
      {
        id: "orbital-mechanics",
        name: "Orbital Mechanics",
        subject: "Physics",
        difficulty: "Hard",
        teaser: "Why does a spacecraft have to speed up to slow down in orbit?",
      },
      {
        id: "life-support-systems",
        name: "Closed-Loop Life Support",
        subject: "Environmental Science",
        difficulty: "Medium",
        teaser: "How do astronauts breathe in a sealed metal can for months?",
      },
    ],
    Technology: [
      {
        id: "neural-networks",
        name: "Neural Networks",
        subject: "CS",
        difficulty: "Medium",
        teaser:
          "How does a machine actually 'learn' to recognize patterns the way humans do?",
      },
      {
        id: "transformer-architecture",
        name: "Attention Mechanism",
        subject: "CS",
        difficulty: "Hard",
        teaser: "What mathematical trick lets AI understand context in language?",
      },
    ],
    Environment: [
      {
        id: "carbon-cycle",
        name: "Carbon Cycle",
        subject: "Environmental Science",
        difficulty: "Easy",
        teaser:
          "How does cutting a tree in Brazil affect rain patterns in India?",
      },
      {
        id: "biodiversity",
        name: "Biodiversity & Ecosystem Services",
        subject: "Biology",
        difficulty: "Medium",
        teaser:
          "Why does losing one species trigger a cascade of extinctions?",
      },
    ],
    "Economics & Finance": [
      {
        id: "inflation",
        name: "Inflation & Monetary Policy",
        subject: "Economics",
        difficulty: "Medium",
        teaser:
          "How does raising interest rates actually make your grocery bill cheaper?",
      },
      {
        id: "bond-yields",
        name: "Bond Yields & Interest Rates",
        subject: "Economics",
        difficulty: "Hard",
        teaser:
          "Why do bond prices fall when interest rates rise — and who wins?",
      },
    ],
    "Health & Medicine": [
      {
        id: "herd-immunity",
        name: "Herd Immunity",
        subject: "Biology",
        difficulty: "Medium",
        teaser:
          "How does vaccinating 70% of people protect the 30% who can't be vaccinated?",
      },
      {
        id: "viral-mutation",
        name: "Viral Mutation & Evolution",
        subject: "Biology",
        difficulty: "Hard",
        teaser:
          "Why do viruses keep changing, and how does that determine whether we win or lose?",
      },
    ],
    Geopolitics: [
      {
        id: "comparative-advantage",
        name: "Comparative Advantage",
        subject: "Economics",
        difficulty: "Medium",
        teaser:
          "Why do countries trade even when one country can produce everything more efficiently?",
      },
      {
        id: "diplomatic-theory",
        name: "Game Theory in Diplomacy",
        subject: "Political Science",
        difficulty: "Hard",
        teaser:
          "How do countries make decisions when every choice depends on what the other side does?",
      },
    ],
  };

  return (
    categoryConceptMap[story.category] ||
    categoryConceptMap["Economics & Finance"]
  );
}
