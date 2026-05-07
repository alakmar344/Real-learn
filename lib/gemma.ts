const GEMMA_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent";

interface GemmaResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{
        web?: { uri: string; title: string };
      }>;
      groundingSupports?: Array<{
        groundingChunkIndices: number[];
        segment: { text: string };
      }>;
    };
  }>;
}

export class GemmaTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `Gemma API request timed out after ${Math.round(timeoutMs / 1000)} seconds`
    );
    this.name = "GemmaTimeoutError";
  }
}

export async function callGemma(
  systemPrompt: string,
  userMessage: string,
  enableSearch: boolean = true,
  temperature: number = 0.7,
  timeoutMs: number = 30000
): Promise<string> {
  const apiKey = process.env.GEMMA_API_KEY;
  if (!apiKey) {
    throw new Error("GEMMA_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestBody: Record<string, unknown> = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      },
    };

    if (enableSearch) {
      requestBody.tools = [{ googleSearch: {} }];
    }

    const response = await fetch(`${GEMMA_API_BASE}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemma API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: GemmaResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No candidates returned from Gemma API");
    }

    const candidate = data.candidates[0];
    const text = candidate.content.parts.map((p) => p.text).join("");

    // Log grounding metadata for debugging
    if (candidate.groundingMetadata) {
      const meta = candidate.groundingMetadata;
      if (meta.webSearchQueries) {
        console.log("[Gemma] Web search queries:", meta.webSearchQueries);
      }
      if (meta.groundingChunks) {
        const sources = meta.groundingChunks
          .filter((c) => c.web)
          .map((c) => c.web?.uri);
        console.log("[Gemma] Grounding sources:", sources);
      }
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new GemmaTimeoutError(timeoutMs);
    }
    throw error;
  }
}

export async function callGemmaWithHistory(
  systemPrompt: string,
  history: Array<{ role: "user" | "model"; content: string }>,
  enableSearch: boolean = false,
  temperature: number = 0.7
): Promise<string> {
  const apiKey = process.env.GEMMA_API_KEY;
  if (!apiKey) {
    throw new Error("GEMMA_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const requestBody: Record<string, unknown> = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature,
        maxOutputTokens: 6144,
      },
    };

    if (enableSearch) {
      requestBody.tools = [{ googleSearch: {} }];
    }

    const response = await fetch(`${GEMMA_API_BASE}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemma API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: GemmaResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No candidates returned from Gemma API");
    }

    const candidate = data.candidates[0];
    const text = candidate.content.parts.map((p) => p.text).join("");

    if (candidate.groundingMetadata?.webSearchQueries) {
      console.log(
        "[Gemma] Web search queries:",
        candidate.groundingMetadata.webSearchQueries
      );
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemma API request timed out after 45 seconds");
    }
    throw error;
  }
}

export function parseJSON<T>(text: string): T | null {
  try {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```\s*$/i, "");
    cleaned = cleaned.trim();

    // Find the first JSON structure (object or array)
    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");

    let startIndex = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      startIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIndex = firstBrace;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    if (startIndex > 0) {
      cleaned = cleaned.slice(startIndex);
    }

    // Find matching closing bracket/brace
    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    const endIndex = Math.max(lastBrace, lastBracket);

    if (endIndex !== -1 && endIndex < cleaned.length - 1) {
      cleaned = cleaned.slice(0, endIndex + 1);
    }

    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error("[parseJSON] Failed to parse JSON:", error);
    console.error("[parseJSON] Raw text:", text.slice(0, 500));
    return null;
  }
}
