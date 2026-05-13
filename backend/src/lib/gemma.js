const GEMMA_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMMA_MODEL = "gemma-4-26b-a4b-it";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 700;
const DEFAULT_MAX_RETRY_DELAY_MS = 5000;
const DEFAULT_TIMEOUT_CIRCUIT_FAILURE_THRESHOLD = 5;
const DEFAULT_TIMEOUT_CIRCUIT_COOLDOWN_MS = 60000;
const PARSE_JSON_LOG_PREVIEW_CHARS = 300;
const timeoutCircuitState = {
  consecutiveTimeouts: 0,
  openUntil: 0,
};

export function formatGemmaTimeoutMessage(timeoutMs) {
  const timeoutSeconds = timeoutMs / 1000;
  return `Gemma API request timed out after ${timeoutSeconds} seconds`;
}

export class GemmaTimeoutError extends Error {
  constructor(timeoutMs) {
    super(formatGemmaTimeoutMessage(timeoutMs));
    this.name = "GemmaTimeoutError";
  }
}

export class GemmaApiError extends Error {
  constructor(status, statusText, details) {
    super(`Gemma API error: ${status} ${statusText} - ${details}`);
    this.name = "GemmaApiError";
    this.status = status;
    this.statusText = statusText;
    this.details = details;
  }
}

export class GemmaCircuitOpenError extends Error {
  constructor(retryAfterMs) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    const secondsLabel = retryAfterSeconds === 1 ? "second" : "seconds";
    super(
      `Gemma service is temporarily paused after repeated timeouts. Retry in about ${retryAfterSeconds} ${secondsLabel}`
    );
    this.name = "GemmaCircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

function parseNonNegativeInt(value, fallbackValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : fallbackValue;
}

function parsePositiveInt(value, fallbackValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallbackValue;
}

function buildGenerateUrl(model) {
  return `${GEMMA_API_ROOT}/${encodeURIComponent(model)}:generateContent`;
}

function stripThinkingTags(text) {
  const source = typeof text === "string" ? text : String(text ?? "");
  return source
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
}

function isRetryableNetworkGemmaError(error) {
  if (!(error instanceof TypeError)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("econnreset") ||
    message.includes("socket")
  );
}

function isRetryableGemmaError(error) {
  if (error instanceof GemmaApiError) {
    return error.status === 429 || (error.status >= 500 && error.status < 600);
  }
  return isRetryableNetworkGemmaError(error);
}

export function isGemmaServiceUnavailableError(error) {
  return (
    error instanceof GemmaTimeoutError ||
    error instanceof GemmaCircuitOpenError ||
    (error instanceof GemmaApiError && (error.status === 429 || error.status >= 500)) ||
    isRetryableNetworkGemmaError(error)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertTimeoutCircuitClosed() {
  const now = Date.now();
  if (timeoutCircuitState.openUntil > now) {
    throw new GemmaCircuitOpenError(timeoutCircuitState.openUntil - now);
  }
}

function recordTimeoutFailure(failureThreshold, cooldownMs) {
  timeoutCircuitState.consecutiveTimeouts += 1;
  if (timeoutCircuitState.consecutiveTimeouts >= failureThreshold) {
    timeoutCircuitState.openUntil = Date.now() + cooldownMs;
    timeoutCircuitState.consecutiveTimeouts = 0;
    console.warn(
      `[Gemma] Timeout circuit opened for ${cooldownMs}ms after repeated timeouts`
    );
    return true;
  }
  return false;
}

function resetTimeoutCircuit() {
  timeoutCircuitState.consecutiveTimeouts = 0;
  timeoutCircuitState.openUntil = 0;
}

export async function callGemma(
  systemPrompt,
  userMessage,
  enableSearch = true,
  temperature = 0.7,
  timeoutMs = 30000,
  signal = null
) {
  const apiKey = process.env.GEMMA_API_KEY;
  if (!apiKey) {
    throw new Error("GEMMA_API_KEY is not configured");
  }
  const callId = `gemma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const models = [GEMMA_MODEL];
  const sanitizedSystemPrompt = stripThinkingTags(systemPrompt);
  const maxRetries = parseNonNegativeInt(
    process.env.GEMMA_MAX_RETRIES,
    DEFAULT_MAX_RETRIES
  );
  const retryDelayMs = parseNonNegativeInt(
    process.env.GEMMA_RETRY_DELAY_MS,
    DEFAULT_RETRY_DELAY_MS
  );
  const maxRetryDelayMs = parseNonNegativeInt(
    process.env.GEMMA_MAX_RETRY_DELAY_MS,
    DEFAULT_MAX_RETRY_DELAY_MS
  );
  const timeoutCircuitFailureThreshold = parsePositiveInt(
    process.env.GEMMA_TIMEOUT_CIRCUIT_FAILURE_THRESHOLD,
    DEFAULT_TIMEOUT_CIRCUIT_FAILURE_THRESHOLD
  );
  const timeoutCircuitCooldownMs = parsePositiveInt(
    process.env.GEMMA_TIMEOUT_CIRCUIT_COOLDOWN_MS,
    DEFAULT_TIMEOUT_CIRCUIT_COOLDOWN_MS
  );
  console.log("[Gemma] callGemma invoked", {
    callId,
    models,
    maxRetries,
    retryDelayMs,
    maxRetryDelayMs,
    timeoutMs,
    timeoutCircuitFailureThreshold,
    timeoutCircuitCooldownMs,
    enableSearch,
    temperature,
    systemPromptLength: systemPrompt?.length ?? 0,
    userMessageLength: userMessage?.length ?? 0,
  });
  assertTimeoutCircuitClosed();
  const requestBody = {
    system_instruction: {
      parts: [{ text: sanitizedSystemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: 4192,
      enable_thinking: false,
    },
  };
  if (enableSearch) {
    requestBody.tools = [{ googleSearch: {} }];
  }

  let lastError = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    const isLastModel = modelIndex === models.length - 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      console.log("[Gemma] attempt start", {
        callId,
        model,
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
      });
      const controller = new AbortController();
      const internalSignal = controller.signal;
      let removeParentAbortListener = null;
      let parentAbortTriggered = false;
      let timeoutTriggered = false;
      if (signal) {
        const abortFromParent = () => {
          parentAbortTriggered = true;
          controller.abort();
        };
        signal.addEventListener("abort", abortFromParent, { once: true });
        removeParentAbortListener = () => {
          signal.removeEventListener("abort", abortFromParent);
        };
      }

      const timeoutId = setTimeout(() => {
        timeoutTriggered = true;
        controller.abort();
      }, timeoutMs);

      try {
        const startedAt = Date.now();
        const response = await fetch(buildGenerateUrl(model), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(requestBody),
          signal: internalSignal,
        });

        clearTimeout(timeoutId);
        removeParentAbortListener?.();
        console.log("[Gemma] response received", {
          callId,
          model,
          attempt: attempt + 1,
          status: response.status,
          ok: response.ok,
          latencyMs: Date.now() - startedAt,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new GemmaApiError(response.status, response.statusText, errorText);
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("No candidates returned from Gemma API");
        }

        const candidate = data.candidates[0];
        const parts = candidate?.content?.parts;

        if (!Array.isArray(parts)) {
          throw new Error("No valid content returned from Gemma API");
        }

        const text = parts
          .filter((p) => !p?.thought)
          .map((p) => p?.text ?? "")
          .join("");
        console.log("[Gemma] parsed candidate text", {
          callId,
          model,
          attempt: attempt + 1,
          candidatesCount: data.candidates.length,
          partsCount: parts.length,
          textLength: text.length,
        });

        const meta = candidate?.groundingMetadata;
        if (meta) {
          if (meta?.webSearchQueries) {
            console.log("[Gemma] Web search queries:", meta.webSearchQueries);
          }
          if (Array.isArray(meta?.groundingChunks)) {
            const sources = meta.groundingChunks
              .filter((c) => c?.web)
              .map((c) => c.web?.uri);
            console.log("[Gemma] Grounding sources:", sources);
          }
        }

        resetTimeoutCircuit();
        console.log("[Gemma] callGemma success", {
          callId,
          model,
          attempt: attempt + 1,
        });
        return text;
      } catch (error) {
        clearTimeout(timeoutId);
        removeParentAbortListener?.();

        if (error.name === "AbortError") {
          if (timeoutTriggered) {
            console.warn("[Gemma] request timed out", {
              callId,
              model,
              attempt: attempt + 1,
              timeoutMs,
            });
            throw new GemmaTimeoutError(timeoutMs);
          }
          if (parentAbortTriggered || signal?.aborted) {
            console.warn("[Gemma] request aborted by caller", {
              callId,
              model,
              attempt: attempt + 1,
            });
            throw error;
          }
          console.warn("[Gemma] request aborted", {
            callId,
            model,
            attempt: attempt + 1,
          });
          throw error;
        }

        const normalizedError =
          error instanceof Error && error.name === "AbortError"
            ? new GemmaTimeoutError(timeoutMs)
            : error;
        console.warn("[Gemma] attempt failed", {
          callId,
          model,
          attempt: attempt + 1,
          errorName: normalizedError?.name,
          errorMessage: normalizedError?.message,
        });
        lastError = normalizedError;
        if (normalizedError instanceof GemmaTimeoutError) {
          const circuitOpened = recordTimeoutFailure(
            timeoutCircuitFailureThreshold,
            timeoutCircuitCooldownMs
          );
          if (circuitOpened) {
            throw new GemmaCircuitOpenError(timeoutCircuitCooldownMs);
          }
        }

        const isLastAttempt = attempt === maxRetries;
        if (!isLastAttempt && isRetryableGemmaError(normalizedError)) {
          const waitMs = Math.min(
            retryDelayMs * Math.pow(2, attempt),
            maxRetryDelayMs
          );
          console.warn(
            `[Gemma] Retrying model "${model}" after attempt ${attempt + 1} failed`
          );
          console.warn("[Gemma] retry scheduled", {
            callId,
            model,
            attempt: attempt + 1,
            waitMs,
          });
          await sleep(waitMs);
          continue;
        }

        if (!isLastModel && isRetryableGemmaError(normalizedError)) {
          console.warn(
            `[Gemma] Switching to fallback model after retries failed for "${model}"`
          );
          break;
        }

        throw normalizedError;
      }
    }
  }

  console.error("[Gemma] callGemma exhausted all options", {
    callId,
    lastErrorName: lastError?.name,
    lastErrorMessage: lastError?.message,
  });
  throw lastError || new Error("Unable to generate lesson after exhausting retries and fallback models");
}

function closeTruncatedJSON(text) {
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) stack.pop();
    }
  }

  let result = text.replace(/[,:\s]+$/, "");
  if (inString) result += "\"";
  while (stack.length > 0) result += stack.pop();
  return result;
}

export function parseJSON(text) {
  let cleaned = text
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "")
    .replace(/^\s*(?:thinking|thought|reasoning)\s*:\s*/gim, "")
    .trim();
  cleaned = cleaned.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "");
  cleaned = cleaned.trim();

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

  const stripTrailingCommas = (s) => s.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch {}

  const noCommas = stripTrailingCommas(cleaned);
  try {
    return JSON.parse(noCommas);
  } catch {}

  const closed = closeTruncatedJSON(cleaned);
  try {
    return JSON.parse(closed);
  } catch {}
  try {
    return JSON.parse(stripTrailingCommas(closed));
  } catch {}

  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const endIndex = Math.max(lastBrace, lastBracket);
  if (endIndex > 0) {
    const chopped = cleaned.slice(0, endIndex + 1);
    try {
      return JSON.parse(chopped);
    } catch {}
    try {
      return JSON.parse(stripTrailingCommas(chopped));
    } catch {}

    const closedChopped = closeTruncatedJSON(chopped);
    try {
      return JSON.parse(closedChopped);
    } catch {}
    try {
      return JSON.parse(stripTrailingCommas(closedChopped));
    } catch {}
  }

  console.error("[parseJSON] All repair stages failed", {
    preview: text.slice(0, PARSE_JSON_LOG_PREVIEW_CHARS),
    rawLength: text.length,
  });
  return null;
}
