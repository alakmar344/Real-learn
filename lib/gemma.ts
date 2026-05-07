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

export function formatGemmaTimeoutMessage(timeoutMs: number): string {
  const timeoutSeconds = timeoutMs / 1000;
  return `Gemma API request timed out after ${timeoutSeconds} seconds`;
}

export class GemmaTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(formatGemmaTimeoutMessage(timeoutMs));
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

/**
 * Closes a truncated JSON string by tracking bracket/brace/string depth.
 * Handles the case where the model hit its token limit mid-response.
 */
function closeTruncatedJSON(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) stack.pop();
    }
  }

  // Strip trailing comma/colon before we close (incomplete last field)
  let result = text.replace(/[,:\s]+$/, "");
  // If we bailed out mid-string, close the string
  if (inString) result += '"';
  // Close all open containers from innermost to outermost
  while (stack.length > 0) result += stack.pop()!;
  return result;
}

/**
 * Multi-stage JSON parser with automatic repair.
 * Attempts 5 progressive strategies before giving up:
 *   1. Direct parse after stripping fences / leading prose
 *   2. Remove trailing commas (most common model mistake)
 *   3. Close truncated JSON (model hit token limit mid-output)
 *   4. Truncate after last complete closing bracket then retry 1+2+3
 *   5. Full repair pipeline on the truncated slice
 */
export function parseJSON<T>(text: string): T | null {
  // ── Stage 0: strip markdown fences and leading prose ──────────────────────
  let cleaned = text.trim();
  // Remove ```json ... ``` or ``` ... ``` fences (including mid-text ones)
  cleaned = cleaned.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "");
  cleaned = cleaned.trim();

  // Advance to the first { or [ (skip any "Here is..." preamble text)
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
  if (startIndex > 0) cleaned = cleaned.slice(startIndex);
  if (!cleaned) {
    console.error("[parseJSON] No JSON structure found in response");
    return null;
  }

  // Helper: remove trailing commas before ] or }
  const stripTrailingCommas = (s: string) => s.replace(/,\s*([}\]])/g, "$1");

  // ── Stage 1: direct parse ─────────────────────────────────────────────────
  try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

  // ── Stage 2: strip trailing commas ───────────────────────────────────────
  const noCommas = stripTrailingCommas(cleaned);
  try { return JSON.parse(noCommas) as T; } catch { /* continue */ }

  // ── Stage 3: close truncated JSON ────────────────────────────────────────
  const closed = closeTruncatedJSON(cleaned);
  try { return JSON.parse(closed) as T; } catch { /* continue */ }
  try { return JSON.parse(stripTrailingCommas(closed)) as T; } catch { /* continue */ }

  // ── Stage 4: chop after the last matching close bracket ──────────────────
  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const endIndex = Math.max(lastBrace, lastBracket);
  if (endIndex > 0) {
    const chopped = cleaned.slice(0, endIndex + 1);
    try { return JSON.parse(chopped) as T; } catch { /* continue */ }
    try { return JSON.parse(stripTrailingCommas(chopped)) as T; } catch { /* continue */ }

    // ── Stage 5: close + chop ─────────────────────────────────────────────
    const closedChopped = closeTruncatedJSON(chopped);
    try { return JSON.parse(closedChopped) as T; } catch { /* continue */ }
    try { return JSON.parse(stripTrailingCommas(closedChopped)) as T; } catch { /* continue */ }
  }

  console.error("[parseJSON] All 5 repair stages failed.");
  console.error("[parseJSON] Raw text (first 600 chars):", text.slice(0, 600));
  return null;
}
