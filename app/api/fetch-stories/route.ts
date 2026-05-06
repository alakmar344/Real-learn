import { NextResponse } from "next/server";
import { callGemma, parseJSON } from "@/lib/gemma";
import { STORY_FETCH_PROMPT } from "@/lib/prompts";
import { Story } from "@/types";

// Simple in-memory rate limiter
const requestLog: number[] = [];
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  // Remove old entries
  while (requestLog.length > 0 && requestLog[0] < windowStart) {
    requestLog.shift();
  }
  if (requestLog.length >= RATE_LIMIT) {
    return false;
  }
  requestLog.push(now);
  return true;
}

export async function GET() {
  if (!checkRateLimit()) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const userMessage = `Find today's (${today}) 6 most significant global news events. Search for the very latest breaking news right now. Return ONLY a valid JSON array with no markdown fences.`;

    const rawResponse = await callGemma(
      STORY_FETCH_PROMPT,
      userMessage,
      true,
      0.5
    );

    const stories = parseJSON<Story[]>(rawResponse);

    if (!stories || !Array.isArray(stories) || stories.length === 0) {
      // Return fallback stories if parsing fails
      return NextResponse.json(getFallbackStories(today));
    }

    // Validate and sanitize each story
    const validStories = stories
      .filter(
        (s) =>
          s &&
          typeof s.headline === "string" &&
          typeof s.summary === "string" &&
          typeof s.category === "string"
      )
      .map((s, i) => ({
        id: s.id || `story-${i}-${Date.now()}`,
        headline: s.headline || "Breaking News",
        summary: s.summary || "",
        category: s.category || "General",
        region: s.region || "Global",
        imagePrompt: s.imagePrompt || s.category,
        sourceUrl: s.sourceUrl || "#",
        date: s.date || today,
      }))
      .slice(0, 6);

    return NextResponse.json(validStories);
  } catch (error) {
    console.error("[fetch-stories] Error:", error);
    const today = new Date().toISOString().split("T")[0];
    return NextResponse.json(getFallbackStories(today));
  }
}

function getFallbackStories(today: string): Story[] {
  return [
    {
      id: "fallback-1",
      headline: "NASA's Artemis Program Eyes Moon Return as Orion Completes Tests",
      summary:
        "NASA engineers complete critical life support system tests on the Orion spacecraft ahead of the next crewed lunar mission. The test validates oxygen generation and CO2 scrubbing systems designed to keep astronauts alive in deep space for up to 21 days.",
      category: "Science & Space",
      region: "United States",
      imagePrompt: "NASA Orion spacecraft moon mission astronauts space",
      sourceUrl: "https://www.nasa.gov",
      date: today,
    },
    {
      id: "fallback-2",
      headline: "OpenAI Unveils GPT-5 with Multimodal Reasoning Breakthroughs",
      summary:
        "OpenAI's latest model demonstrates unprecedented reasoning across text, images, and audio simultaneously. Early benchmarks show a 40% improvement in complex mathematical problem-solving and a new ability to explain its own reasoning chain step by step.",
      category: "Technology",
      region: "Global",
      imagePrompt: "artificial intelligence neural network technology breakthrough",
      sourceUrl: "https://openai.com",
      date: today,
    },
    {
      id: "fallback-3",
      headline: "Amazon Deforestation Hits Record Low as Brazil Enforcement Ramps Up",
      summary:
        "Brazil's INPE satellite monitoring system reports a 45% reduction in Amazon deforestation compared to last year, crediting stricter enforcement and indigenous land protections. However, scientists warn that fragmented forest patches continue to lose biodiversity even without direct clearing.",
      category: "Environment",
      region: "Brazil",
      imagePrompt: "Amazon rainforest aerial view deforestation satellite",
      sourceUrl: "https://www.inpe.br",
      date: today,
    },
    {
      id: "fallback-4",
      headline: "Federal Reserve Signals Pause on Rate Hikes as Inflation Cools to 2.4%",
      summary:
        "US inflation dropped to 2.4% in the latest CPI report, prompting Federal Reserve officials to signal a pause in their historic rate-hiking cycle. Markets rallied sharply as bond yields fell and mortgage rates dipped below 7% for the first time in months.",
      category: "Economics & Finance",
      region: "United States",
      imagePrompt: "Federal Reserve building economy inflation interest rates",
      sourceUrl: "https://www.federalreserve.gov",
      date: today,
    },
    {
      id: "fallback-5",
      headline: "WHO Declares Mpox Emergency Over as New Variant Shows Reduced Severity",
      summary:
        "The World Health Organization has ended its public health emergency declaration for mpox after the new variant showed significantly reduced mortality rates. Researchers attribute the improvement to widespread vaccination campaigns across Central Africa and improved clinical protocols.",
      category: "Health & Medicine",
      region: "Global",
      imagePrompt: "WHO health medicine virus vaccine global health",
      sourceUrl: "https://www.who.int",
      date: today,
    },
    {
      id: "fallback-6",
      headline: "India and China Resume Direct Flights After 5-Year Diplomatic Freeze",
      summary:
        "Air India and Air China will resume direct flights between Mumbai and Beijing for the first time since 2020, marking a significant thaw in bilateral relations. The route reopening follows months of quiet diplomatic back-channels and is expected to revive a $130 billion trade relationship.",
      category: "Geopolitics",
      region: "India / China",
      imagePrompt: "India China diplomacy flags airline international relations",
      sourceUrl: "https://www.mea.gov.in",
      date: today,
    },
  ];
}
