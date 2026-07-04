import Groq from "groq-sdk";

const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 700;
const DEFAULT_MAX_RETRY_DELAY_MS = 5000;
const DEFAULT_TIMEOUT_CIRCUIT_FAILURE_THRESHOLD = 5;
const DEFAULT_TIMEOUT_CIRCUIT_COOLDOWN_MS = 60000;
const PARSE_JSON_LOG_PREVIEW_CHARS = 300;

let groqClient = null;

function getGroq() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    // Retries are handled by our own retry loop below, so disable the SDK's
    // built-in retry mechanism to avoid compounding delays.
    groqClient = new Groq({ apiKey, maxRetries: 0 });
  }
  return groqClient;
}

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

function isGemmaServiceUnavailableError(error) {
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

function isAbortError(error) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      (typeof error.message === "string" && /\baborted\b/i.test(error.message)))
  );
}

function normalizeSdkError(error) {
  if (error instanceof Groq.APIConnectionError) {
    // Surface transient connection problems as a retryable network error.
    return new TypeError(`network error: ${error.message}`);
  }
  if (error instanceof Groq.APIError) {
    const status = typeof error.status === "number" ? error.status : 0;
    return new GemmaApiError(status, error.name ?? "APIError", error.message);
  }
  return error;
}

export async function callGemma(
  systemPrompt,
  userMessage,
  enableSearch = true,
  temperature = 0.7,
  timeoutMs = 30000,
  signal = null,
  maxOutputTokens = 3000
) {
  if (!process.env.GROQ_API_KEY?.trim()) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  if (enableSearch) {
    // The Groq API has no built-in web-search grounding tool (the Vertex AI
    // googleSearch tool this replaced). Real-world context is injected into
    // the prompt upstream via Serper instead.
    console.warn(
      "[Gemma] enableSearch requested but web-search grounding is not supported on the Groq API; continuing without it"
    );
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
    systemPromptLength: sanitizedSystemPrompt?.length ?? 0,
    userMessageLength: userMessage?.length ?? 0,
  });
  assertTimeoutCircuitClosed();

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
        console.log("[Gemma] SDK model", {
          callId,
          model,
          attempt: attempt + 1,
        });

        const groq = getGroq();
        const response = await groq.chat.completions.create(
          {
            model,
            messages: [
              { role: "system", content: sanitizedSystemPrompt },
              { role: "user", content: userMessage },
            ],
            temperature,
            max_completion_tokens: maxOutputTokens,
          },
          { signal: internalSignal }
        );

        clearTimeout(timeoutId);
        removeParentAbortListener?.();
        console.log("[Gemma] response received", {
          callId,
          model,
          attempt: attempt + 1,
          choicesCount: response?.choices?.length ?? 0,
          latencyMs: Date.now() - startedAt,
        });

        if (!response.choices || response.choices.length === 0) {
          throw new Error("No choices returned from Groq API");
        }

        const choice = response.choices[0];
        const finishReason = choice?.finish_reason;

        if (finishReason === "content_filter") {
          throw new Error(
            "Content was flagged by safety filters. Please try a different question or rephrase your request."
          );
        }

        const text = stripThinkingTags(choice?.message?.content ?? "");
        console.log("[Gemma] parsed choice text", {
          callId,
          model,
          attempt: attempt + 1,
          finishReason,
          textLength: text.length,
        });

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

        if (isAbortError(error)) {
          if (timeoutTriggered) {
            console.warn("[Gemma] request timed out", {
              callId,
              model,
              attempt: attempt + 1,
              timeoutMs,
            });
            const timeoutError = new GemmaTimeoutError(timeoutMs);
            lastError = timeoutError;
            const circuitOpened = recordTimeoutFailure(
              timeoutCircuitFailureThreshold,
              timeoutCircuitCooldownMs
            );
            if (circuitOpened) {
              throw new GemmaCircuitOpenError(timeoutCircuitCooldownMs);
            }
            continue;
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

        const normalizedError = normalizeSdkError(error);
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
    if (ch === '"') {
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
  if (inString) result += '"';
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
