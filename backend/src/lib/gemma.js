import Cerebras from "@cerebras/cerebras_cloud_sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider AI inference engine.
//
// Providers:
//   • "cerebras"  — Cerebras Cloud SDK (Gemma 4 31B), the primary.
//   • "cloudflare" — Cloudflare Workers AI (Gemma), the fallback.
//
// Both providers are individually unreliable, so the engine is built around
// three ideas that together give the fastest answer that actually succeeds:
//
//   1. HEDGED RACING — the healthiest provider starts first; if it hasn't
//      answered within AI_HEDGE_DELAY_MS (or fails outright), the other
//      provider is launched IN PARALLEL. First success wins and the loser is
//      aborted. A slow/dying primary therefore costs at most the hedge delay,
//      not a full timeout + retry ladder.
//
//   2. PER-PROVIDER CIRCUIT BREAKERS — repeated availability failures open
//      that provider's circuit for a cooldown, so requests route straight to
//      the healthy provider instead of burning their latency budget on a dead
//      one. When EVERY circuit is open, the engine still half-open-probes the
//      provider closest to recovery rather than failing the user outright.
//
//   3. MODEL ROTATION — each provider carries an ordered model list
//      (GEMMA_MODEL + GEMMA_FALLBACK_MODELS). Free-tier or hosted models get
//      rate-limited or removed without notice; on a model-shaped failure
//      (404/400/429) the engine advances to the next model and REMEMBERS the
//      working one for subsequent requests.
//
// Health (EWMA latency + consecutive failures) is tracked per provider and
// used to decide who starts first on the next request.
// ─────────────────────────────────────────────────────────────────────────────

export const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-4-31b";

const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 700;
const DEFAULT_MAX_RETRY_DELAY_MS = 5000;
// 408 = upstream timeout, usually a cold start on Cloudflare Workers AI.
// The model needs 10-30s to load — retrying too early just wastes a retry.
const COLD_START_RETRY_DELAY_MS = 15000;
const COLD_START_MAX_RETRY_DELAY_MS = 45000;
// When another provider is racing in parallel there is no reason to sit out
// a full cold-start window before retrying — the fallback already covers the
// user's latency. Cap in-race backoffs low so the loser keeps trying cheaply.
const RACING_MAX_RETRY_DELAY_MS = 2500;
// Trip the circuit after 2 consecutive availability failures. A degraded
// provider times out on EVERY call, so a high threshold means many requests
// waste their latency budget on a dead provider before the circuit opens.
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 2;
const DEFAULT_CIRCUIT_COOLDOWN_MS = 60000;
// How long the leading provider gets to itself before the second provider is
// considered for hedging. COST CONTROL: the hedge only fires if the leader
// has shown NO sign of life (no bytes received) by then — a healthy provider
// that is merely generating never triggers the hedge, so the fallback's
// free-tier limits and duplicate tokens are spent ONLY on rescues.
const DEFAULT_HEDGE_DELAY_MS = 12000;
// Streaming watchdogs. Responses are streamed so a hung request is detected
// by silence, not by burning the whole per-attempt timeout (production logs
// showed 45s wasted per hang):
//  - first byte: cold starts legitimately take 10-30s, so allow 20s
//  - between chunks: a generating model emits tokens continuously; 15s of
//    mid-stream silence means the request is dead
const DEFAULT_FIRST_BYTE_TIMEOUT_MS = 20000;
const DEFAULT_STALL_TIMEOUT_MS = 15000;
const PARSE_JSON_LOG_PREVIEW_CHARS = 300;

// ── Errors (public API — server.js maps these to friendly client messages) ──

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
  constructor(status, statusText, details, retryAfterMs) {
    super(`Gemma API error: ${status} ${statusText} - ${details}`);
    this.name = "GemmaApiError";
    this.status = status;
    this.statusText = statusText;
    this.details = details;
    this.retryAfterMs = retryAfterMs;
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

// ── Env helpers ──────────────────────────────────────────────────────────────

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

function parseModelList(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getEngineConfig() {
  return {
    maxRetries: parseNonNegativeInt(
      process.env.GEMMA_MAX_RETRIES,
      DEFAULT_MAX_RETRIES
    ),
    retryDelayMs: parseNonNegativeInt(
      process.env.GEMMA_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    ),
    maxRetryDelayMs: parseNonNegativeInt(
      process.env.GEMMA_MAX_RETRY_DELAY_MS,
      DEFAULT_MAX_RETRY_DELAY_MS
    ),
    circuitFailureThreshold: parsePositiveInt(
      process.env.GEMMA_TIMEOUT_CIRCUIT_FAILURE_THRESHOLD,
      DEFAULT_CIRCUIT_FAILURE_THRESHOLD
    ),
    circuitCooldownMs: parsePositiveInt(
      process.env.GEMMA_TIMEOUT_CIRCUIT_COOLDOWN_MS,
      DEFAULT_CIRCUIT_COOLDOWN_MS
    ),
    hedgeDelayMs: parseNonNegativeInt(
      process.env.AI_HEDGE_DELAY_MS,
      DEFAULT_HEDGE_DELAY_MS
    ),
    firstByteTimeoutMs: parseNonNegativeInt(
      process.env.AI_FIRST_BYTE_TIMEOUT_MS,
      DEFAULT_FIRST_BYTE_TIMEOUT_MS
    ),
    stallTimeoutMs: parseNonNegativeInt(
      process.env.AI_STALL_TIMEOUT_MS,
      DEFAULT_STALL_TIMEOUT_MS
    ),
  };
}

// ── Text utilities ───────────────────────────────────────────────────────────

function stripThinkingTags(text) {
  const source = typeof text === "string" ? text : String(text ?? "");
  return source
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
}

// ── Error classification ─────────────────────────────────────────────────────

// Transient socket/DNS-level failure codes (Node net + undici). Any of these
// mid-request — including while READING the response body — is worth a retry.
const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

function isRetryableNetworkGemmaError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  // undici wraps the real cause (e.g. "TypeError: fetch failed" with an
  // ECONNRESET cause), so check both the error and its cause.
  const code = error.code ?? error.cause?.code;
  if (typeof code === "string" && RETRYABLE_NETWORK_ERROR_CODES.has(code)) {
    return true;
  }

  const message = `${error.message ?? ""} ${error.cause?.message ?? ""}`.toLowerCase();
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("econnreset") ||
    message.includes("socket") ||
    // undici throws "terminated" / "other side closed" / "premature close"
    // when the connection drops while the response body is being read —
    // this is the classic "error in input stream" failure mode.
    message.includes("terminated") ||
    message.includes("other side closed") ||
    message.includes("premature close") ||
    message.includes("input stream")
  );
}

function isRetryableGemmaError(error) {
  if (error instanceof GemmaTimeoutError) return true;
  if (error instanceof GemmaApiError) {
    // 408 = upstream request timeout (transient), 429 = rate limit
    // (transient), 403 = Cloudflare Workers AI rate limiting (transient),
    // 5xx = server error (transient). 401 is an auth error — retrying won't
    // help. 404/400 are handled via model rotation.
    if (
      error.status === 408 ||
      error.status === 429 ||
      error.status === 403 ||
      (error.status >= 500 && error.status < 600)
    ) {
      return true;
    }
    // Cloudflare occasionally reports transient stream failures with a
    // non-retryable-looking status code; match on the upstream message.
    const details = String(error.details ?? "").toLowerCase();
    return details.includes("input stream") || details.includes("timed out");
  }
  return isRetryableNetworkGemmaError(error);
}

// Failures that indicate the PROVIDER is unavailable (feeds the circuit
// breaker). Auth/validation errors do not count — the provider answered.
function isAvailabilityFailure(error) {
  return (
    error instanceof GemmaTimeoutError ||
    (error instanceof GemmaApiError &&
      (error.status === 408 || error.status === 429 || error.status === 403 ||
        error.status >= 500)) ||
    isRetryableNetworkGemmaError(error)
  );
}

// A model-shaped failure: this specific model is missing/invalid/throttled.
// Worth rotating to the next model in the provider's list.
function isModelRotationFailure(error) {
  return (
    error instanceof GemmaApiError &&
    (error.status === 400 || error.status === 404 || error.status === 429)
  );
}

function isGemmaServiceUnavailableError(error) {
  return (
    error instanceof GemmaCircuitOpenError || isAvailabilityFailure(error)
  );
}

function isAbortError(error) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      (typeof error.message === "string" && /\baborted\b/i.test(error.message)))
  );
}

// ── Small async utilities ────────────────────────────────────────────────────

function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// Full jitter keeps concurrent retries from stampeding a recovering provider.
function jitter(ms) {
  return Math.max(50, Math.round(ms / 2 + Math.random() * (ms / 2)));
}

// ── Provider health / circuit breakers ───────────────────────────────────────

function newProviderHealth() {
  return {
    consecutiveFailures: 0,
    openUntil: 0,
    ewmaLatencyMs: null,
    modelIndex: 0,
    lastErrorName: null,
    lastSuccessAt: 0,
  };
}

const providerHealth = {
  cerebras: newProviderHealth(),
  cloudflare: newProviderHealth(),
};

function recordProviderSuccess(providerKey, latencyMs, modelIndex) {
  const health = providerHealth[providerKey];
  health.consecutiveFailures = 0;
  health.openUntil = 0;
  health.lastErrorName = null;
  health.lastSuccessAt = Date.now();
  health.modelIndex = modelIndex;
  health.ewmaLatencyMs =
    health.ewmaLatencyMs == null
      ? latencyMs
      : Math.round(health.ewmaLatencyMs * 0.7 + latencyMs * 0.3);
}

function recordProviderFailure(providerKey, error, config) {
  const health = providerHealth[providerKey];
  health.lastErrorName = error?.name ?? "Error";
  if (!isAvailabilityFailure(error)) return false;
  health.consecutiveFailures += 1;
  if (health.consecutiveFailures >= config.circuitFailureThreshold) {
    health.openUntil = Date.now() + config.circuitCooldownMs;
    health.consecutiveFailures = 0;
    console.warn(
      `[AI] Circuit opened for provider "${providerKey}" (${config.circuitCooldownMs}ms cooldown)`
    );
    return true;
  }
  return false;
}

function isCircuitOpen(providerKey) {
  return providerHealth[providerKey].openUntil > Date.now();
}

/** Introspection for /health-style endpoints and tests. */
export function getProviderHealthSnapshot() {
  const now = Date.now();
  const snapshot = {};
  for (const [key, health] of Object.entries(providerHealth)) {
    snapshot[key] = {
      circuitOpen: health.openUntil > now,
      circuitOpenForMs: Math.max(0, health.openUntil - now),
      consecutiveFailures: health.consecutiveFailures,
      ewmaLatencyMs: health.ewmaLatencyMs,
      lastErrorName: health.lastErrorName,
      lastSuccessAt: health.lastSuccessAt || null,
      preferredModelIndex: health.modelIndex,
    };
  }
  return snapshot;
}

/** Test-only helper: reset all circuit/health state. */
export function resetProviderHealth() {
  providerHealth.cerebras = newProviderHealth();
  providerHealth.cloudflare = newProviderHealth();
}

// ── Provider registry ────────────────────────────────────────────────────────

function isCerebrasConfigured() {
  return Boolean(process.env.CEREBRAS_API_KEY?.trim());
}

function isCloudflareConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  );
}

/** @deprecated Use isCloudflareConfigured() directly. Kept for server.js compatibility. */
export function isFallbackConfigured() {
  return isCloudflareConfigured();
}

function getCerebrasModels() {
  const models = [GEMMA_MODEL, ...parseModelList(process.env.GEMMA_FALLBACK_MODELS)];
  return [...new Set(models)];
}

function getCloudflareModels() {
  const models = [
    ...parseModelList(process.env.CLOUDFLARE_AI_MODEL),
    ...parseModelList(process.env.CLOUDFLARE_AI_MODELS),
  ];
  if (models.length === 0) models.push("@cf/google/gemma-4-26b-a4b-it");
  return [...new Set(models)];
}

function getProviders(allowFallback) {
  const providers = [];
  if (isCerebrasConfigured()) {
    providers.push({
      key: "cerebras",
      label: "Cerebras Cloud (Gemma 4 31B)",
      models: getCerebrasModels(),
      call: (model, body, signal, opts) =>
        callCerebras(model, body, signal, opts),
    });
  }
  if (allowFallback && isCloudflareConfigured()) {
    providers.push({
      key: "cloudflare",
      label: "Cloudflare Workers AI",
      models: getCloudflareModels(),
      call: (model, body, signal, opts) =>
        callWorkersAI(process.env.CLOUDFLARE_ACCOUNT_ID.trim(), model, body, signal, opts),
    });
  }
  return providers;
}

// Healthiest first: closed circuits before open ones, then lowest observed
// latency, then registry order (Cloudflare first) as a stable tiebreak.
function orderProviders(providers) {
  return [...providers].sort((a, b) => {
    const openA = isCircuitOpen(a.key) ? 1 : 0;
    const openB = isCircuitOpen(b.key) ? 1 : 0;
    if (openA !== openB) return openA - openB;
    const latencyA = providerHealth[a.key].ewmaLatencyMs ?? Infinity;
    const latencyB = providerHealth[b.key].ewmaLatencyMs ?? Infinity;
    if (latencyA !== latencyB) return latencyA - latencyB;
    return 0;
  });
}

// ── HTTP layer ───────────────────────────────────────────────────────────────

function parseRetryAfterMs(response) {
  const header = response.headers.get("Retry-After");
  if (typeof header !== "string") return undefined;
  const parsed = Number(header);
  if (Number.isFinite(parsed) && parsed > 0) return parsed * 1000;
  return undefined;
}

async function readErrorDetails(response, contentType) {
  try {
    if (contentType.includes("application/json")) {
      const errBody = await response.json();
      return (
        errBody.errors?.[0]?.message ||
        errBody.error?.message ||
        (typeof errBody.error === "string" ? errBody.error : null) ||
        JSON.stringify(errBody)
      );
    }
    return (await response.text()).slice(0, 500);
  } catch {
    return response.statusText;
  }
}

// Fetch a chat completion with a SILENCE WATCHDOG. `opts.onActivity` fires on
// every sign of life (headers, each stream chunk) — the race orchestrator
// uses it to skip hedging a provider that is alive and generating. If the
// provider goes silent past the watchdog windows, the request is aborted and
// surfaced as a retryable 408 so retries/fallback kick in within seconds
// instead of burning the full per-attempt timeout.
async function fetchChatCompletion(url, headers, payload, signal, opts = {}) {
  const { firstByteTimeoutMs = 0, stallTimeoutMs = 0, onActivity } = opts;

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });

  let watchdogFired = false;
  let watchdogAtMs = 0;
  let watchdogTimer = null;
  let receivedData = false;
  const disarmWatchdog = () => {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = null;
  };
  const armWatchdog = (ms) => {
    disarmWatchdog();
    if (!(ms > 0)) return;
    watchdogAtMs = ms;
    watchdogTimer = setTimeout(() => {
      watchdogFired = true;
      controller.abort();
    }, ms);
  };
  const activity = () => {
    receivedData = true;
    onActivity?.();
    armWatchdog(stallTimeoutMs);
  };

  armWatchdog(firstByteTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
        "Accept-Encoding": "gzip, deflate, br",
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // Headers only reset the watchdog; "alive" (hedge-skipping) is reserved
    // for HEALTHY responses — an error reply is not a generation in progress.
    armWatchdog(stallTimeoutMs);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const retryAfterMs = parseRetryAfterMs(response);
      const details = await readErrorDetails(response, contentType);
      throw new GemmaApiError(
        response.status,
        response.statusText,
        details,
        retryAfterMs
      );
    }
    activity();

    if (contentType.includes("text/event-stream")) {
      return await handleStreamingResponse(response, activity);
    }

    if (!contentType.includes("application/json")) {
      return await response.text();
    }

    const data = await response.json();
    if (data.error) {
      throw new GemmaApiError(
        data.error.code || 500,
        "APIError",
        data.error.message || JSON.stringify(data.error),
        parseRetryAfterMs(response)
      );
    }
    return data;
  } catch (error) {
    if (watchdogFired && isAbortError(error)) {
      // 408 keeps this on the retryable/rotate/circuit path.
      const stallError = new GemmaApiError(
        408,
        "StallTimeout",
        `provider sent no data for ${watchdogAtMs}ms (silence watchdog)`
      );
      // A stall AFTER data flowed is a dead connection, not a cold start —
      // the retry scheduler must not sit out the 15s cold-start window.
      stallError.receivedData = receivedData;
      throw stallError;
    }
    throw error;
  } finally {
    disarmWatchdog();
    signal?.removeEventListener("abort", forwardAbort);
  }
}

// LATENCY: Gemma 4 is a reasoning model — it spends output tokens "thinking"
// before the answer (we strip those tags but still pay for the time). Most
// hosts accept the vLLM-style `chat_template_kwargs: { enable_thinking:
// false }` to turn that off, roughly halving wall-clock generation for
// structured-output workloads like ours. Because not every host tolerates
// the extra field, it is opt-in per provider:
//   AI_DISABLE_THINKING = off (default) | cerebras | cloudflare | both
function thinkingDisabledFor(providerKey) {
  const mode = (process.env.AI_DISABLE_THINKING || "off").trim().toLowerCase();
  return mode === "both" || mode === providerKey;
}

async function callWorkersAI(accountId, model, body, signal, opts) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!apiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN is not configured");
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
  const payload = {
    model,
    messages: body.messages,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    // Streaming is what makes the silence watchdog possible: a healthy
    // generation emits tokens continuously, a hung one goes quiet and is
    // killed in seconds instead of after the full timeout.
    stream: true,
  };
  if (thinkingDisabledFor("cloudflare")) {
    payload.chat_template_kwargs = { enable_thinking: false };
  }
  return fetchChatCompletion(
    url,
    { Authorization: `Bearer ${apiToken}` },
    payload,
    signal,
    opts
  );
}

function wrapCerebrasError(error) {
  // The SDK surfaces caller aborts as APIUserAbortError. Convert to a real
  // AbortError so the rest of the engine treats it as a cancellation.
  // Must be checked BEFORE isAbortError() because the transpiled SDK error
  // has name 'Error' and message 'Request was aborted.', which the broad
  // isAbortError() regex would otherwise treat as an abort.
  if (
    error?.name === "APIUserAbortError" ||
    error?.constructor?.name === "APIUserAbortError"
  ) {
    const abortError = new Error(error.message || "The operation was aborted");
    abortError.name = "AbortError";
    return abortError;
  }
  if (isAbortError(error)) {
    return error;
  }
  const status = Number(error?.status);
  if (Number.isFinite(status)) {
    return new GemmaApiError(
      status,
      error.name || "CerebrasError",
      error.message || String(error),
      undefined
    );
  }
  if (error?.name?.includes("Timeout") || error?.name === "APIConnectionTimeoutError") {
    return new GemmaTimeoutError(0);
  }
  if (error?.name === "APIConnectionError") {
    return new GemmaApiError(502, "ConnectionError", error.message || String(error));
  }
  return error;
}

async function callCerebras(model, body, signal, opts) {
  const apiKey = process.env.CEREBRAS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CEREBRAS_API_KEY is not configured");
  }

  const { firstByteTimeoutMs = 0, stallTimeoutMs = 0, onActivity } = opts;

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });

  let watchdogFired = false;
  let watchdogAtMs = 0;
  let watchdogTimer = null;
  let receivedData = false;

  const disarmWatchdog = () => {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = null;
  };
  const armWatchdog = (ms) => {
    disarmWatchdog();
    if (!(ms > 0)) return;
    watchdogAtMs = ms;
    watchdogTimer = setTimeout(() => {
      watchdogFired = true;
      controller.abort();
    }, ms);
  };
  const activity = () => {
    receivedData = true;
    onActivity?.();
    armWatchdog(stallTimeoutMs);
  };

  armWatchdog(firstByteTimeoutMs);

  const cerebras = new Cerebras({
    apiKey,
    maxRetries: 0,
    timeout: 600000, // 10 minutes — the engine's own watchdogs + abort handle timeouts.
    // Use the global fetch so tests can intercept requests with a mock.
    fetch: globalThis.fetch,
  });

  try {
    const payload = {
      model,
      messages: body.messages,
      temperature: body.temperature,
      max_completion_tokens: body.max_tokens,
      stream: true,
      top_p: 0.95,
    };
    if (thinkingDisabledFor("cerebras")) {
      payload.chat_template_kwargs = { enable_thinking: false };
    }
    const stream = await cerebras.chat.completions.create(
      payload,
      { signal: controller.signal }
    );

    let fullText = "";
    for await (const chunk of stream) {
      activity();
      const streamError = extractStreamChunkError(chunk);
      if (streamError) {
        throw new GemmaApiError(408, "StreamError", streamError);
      }
      const token = chunk.choices?.[0]?.delta?.content ?? "";
      fullText += token;
    }

    if (!fullText.trim()) {
      throw new GemmaApiError(
        502,
        "EmptyResponse",
        "Cerebras returned an empty response body"
      );
    }

    return { choices: [{ message: { content: fullText } }] };
  } catch (error) {
    if (watchdogFired && isAbortError(error)) {
      const stallError = new GemmaApiError(
        408,
        "StallTimeout",
        `provider sent no data for ${watchdogAtMs}ms (silence watchdog)`
      );
      stallError.receivedData = receivedData;
      throw stallError;
    }
    throw wrapCerebrasError(error);
  } finally {
    disarmWatchdog();
    signal?.removeEventListener("abort", forwardAbort);
  }
}

/**
 * Direct call to the Cloudflare fallback provider.
 * Public because server.js uses it for circuit-independent "last rung"
 * attempts. Returns the raw completion payload — pass it through
 * extractTextFromResult() to get text.
 */
export async function callCloudflareAI(model, body, signal) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const models = getCloudflareModels();
  const preferred = models[providerHealth.cloudflare.modelIndex % models.length];
  return callWorkersAI(accountId, preferred || model, body, signal, {});
}

/** @deprecated Renamed to callCloudflareAI. Kept for compatibility. */
export async function callFallbackAI(model, body, signal) {
  return callCloudflareAI(model, body, signal);
}

// Cloudflare Workers AI can report a mid-stream failure (e.g. 408 "error in
// input stream") as an error payload INSIDE the SSE stream rather than as an
// HTTP error status. Detect it and throw a retryable GemmaApiError instead of
// silently returning empty/truncated text that later fails JSON validation.
function extractStreamChunkError(chunk) {
  if (!chunk || typeof chunk !== "object") return null;
  if (typeof chunk.error === "string" && chunk.error.trim()) return chunk.error;
  if (chunk.error && typeof chunk.error === "object") {
    return chunk.error.message || JSON.stringify(chunk.error);
  }
  if (Array.isArray(chunk.errors) && chunk.errors.length > 0) {
    return chunk.errors[0]?.message || JSON.stringify(chunk.errors[0]);
  }
  return null;
}

async function handleStreamingResponse(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  const consumePayload = (payload) => {
    if (payload === "[DONE]") return;
    try {
      const chunk = JSON.parse(payload);
      const streamError = extractStreamChunkError(chunk);
      if (streamError) {
        // 408 keeps this on the retryable path (see isRetryableGemmaError).
        throw new GemmaApiError(408, "StreamError", streamError);
      }
      const token =
        chunk.choices?.[0]?.delta?.content ??
        chunk.choices?.[0]?.message?.content ??
        chunk.response ??
        "";
      fullText += token;
    } catch (error) {
      if (error instanceof GemmaApiError) throw error;
      // Non-JSON keep-alive/comment lines are safe to ignore.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk?.();
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      consumePayload(trimmed.slice(6));
    }
  }

  buffer += decoder.decode();
  if (buffer.trim().startsWith("data: ")) {
    consumePayload(buffer.trim().slice(6));
  }

  return { choices: [{ message: { content: fullText } }] };
}

export function extractTextFromResult(result) {
  if (result == null) {
    throw new Error("Empty result returned from AI provider");
  }
  let text;
  if (typeof result === "string") {
    text = result;
  } else {
    const message = result?.choices?.[0]?.message ?? result?.message ?? {};
    text =
      message?.content ??
      message?.reasoning ??
      message?.reasoning_content ??
      result?.choices?.[0]?.text ??
      result?.result?.response ??
      result?.response ??
      result?.content ??
      "";
    if (typeof text !== "string") {
      text = JSON.stringify(text);
    }
  }
  text = stripThinkingTags(text);
  if (!text.trim()) {
    throw new GemmaApiError(
      502,
      "EmptyResponse",
      "AI provider returned an empty response body"
    );
  }
  return text;
}

// ── Provider runner: retries + model rotation for ONE provider ──────────────

class ProviderExhaustedError extends Error {
  constructor(providerKey, cause) {
    super(`Provider "${providerKey}" exhausted all attempts: ${cause?.message}`);
    this.name = "ProviderExhaustedError";
    this.providerKey = providerKey;
    this.cause = cause;
  }
}

async function runProviderAttempts(provider, request, config, raceState) {
  const { messages, temperature, maxOutputTokens, timeoutMs, callId, parentSignal, raceSignal } = request;
  const health = providerHealth[provider.key];
  const models = provider.models.length > 0 ? provider.models : [GEMMA_MODEL];
  let lastError = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (parentSignal?.aborted || raceSignal?.aborted) {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    // Always use the provider's CURRENT preferred model — rotation on a
    // model-shaped failure advances it, and success pins it for next time.
    const modelIndex = health.modelIndex % models.length;
    const model = models[modelIndex];

    const controller = new AbortController();
    let timeoutTriggered = false;
    const abortForwarder = () => controller.abort();
    parentSignal?.addEventListener("abort", abortForwarder, { once: true });
    raceSignal?.addEventListener("abort", abortForwarder, { once: true });
    const timeoutId = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, timeoutMs);

    const startedAt = Date.now();
    try {
      console.log("[AI] attempt start", {
        callId,
        provider: provider.key,
        model,
        attempt: attempt + 1,
        maxAttempts: config.maxRetries + 1,
      });

      const result = await provider.call(
        model,
        { messages, temperature, max_tokens: maxOutputTokens },
        controller.signal,
        {
          firstByteTimeoutMs: config.firstByteTimeoutMs,
          stallTimeoutMs: config.stallTimeoutMs,
          // Liveness signal for the race orchestrator: a provider that is
          // receiving data must not be hedged against (cost control).
          onActivity: () => raceState?.markAlive?.(),
        }
      );
      const text = extractTextFromResult(result);

      const latencyMs = Date.now() - startedAt;
      recordProviderSuccess(provider.key, latencyMs, modelIndex);
      console.log("[AI] attempt success", {
        callId,
        provider: provider.key,
        model,
        attempt: attempt + 1,
        latencyMs,
        textLength: text.length,
      });
      return text;
    } catch (rawError) {
      let error = rawError;

      if (isAbortError(rawError)) {
        if (timeoutTriggered) {
          error = new GemmaTimeoutError(timeoutMs);
        } else {
          // Aborted by the caller or because the other provider already won —
          // propagate untouched; the orchestrator ignores race-cancellations.
          throw rawError;
        }
      }

      lastError = error;
      recordProviderFailure(provider.key, error, config);
      console.warn("[AI] attempt failed", {
        callId,
        provider: provider.key,
        model,
        attempt: attempt + 1,
        latencyMs: Date.now() - startedAt,
        errorName: error?.name,
        errorMessage: error?.message,
      });

      // Rotate away from a model this provider says is bad/throttled — and
      // also from one that timed out or 5xx'd (free-tier models get
      // overloaded/queued without notice) — so the NEXT attempt (and the
      // next request) starts from a healthier model.
      if (
        (isModelRotationFailure(error) || isAvailabilityFailure(error)) &&
        models.length > 1
      ) {
        health.modelIndex = (modelIndex + 1) % models.length;
        console.warn("[AI] rotating model", {
          callId,
          provider: provider.key,
          from: model,
          to: models[health.modelIndex],
        });
      }

      const isLastAttempt = attempt === config.maxRetries;
      if (isLastAttempt || !isRetryableGemmaError(error)) {
        throw new ProviderExhaustedError(provider.key, error);
      }

      // Backoff before the next attempt. Timeouts on Cloudflare usually mean
      // a cold model — wait long enough for it to load, unless another
      // provider is racing (then keep the loser's retries cheap and quick).
      const isColdStart =
        (error instanceof GemmaTimeoutError ||
          (error instanceof GemmaApiError && error.status === 408)) &&
        !error.receivedData;
      const racing = raceState?.othersRunning?.() ?? false;
      const baseDelay = isColdStart ? COLD_START_RETRY_DELAY_MS : config.retryDelayMs;
      const cap = racing
        ? RACING_MAX_RETRY_DELAY_MS
        : isColdStart
          ? COLD_START_MAX_RETRY_DELAY_MS
          : config.maxRetryDelayMs;
      const waitMs = error.retryAfterMs
        ? Math.min(error.retryAfterMs, cap)
        : Math.min(jitter(baseDelay * Math.pow(2, attempt)), cap);
      console.warn("[AI] retry scheduled", {
        callId,
        provider: provider.key,
        attempt: attempt + 1,
        waitMs,
        isColdStart,
        racing,
      });
      await sleep(waitMs, raceSignal ?? parentSignal);
    } finally {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener("abort", abortForwarder);
      raceSignal?.removeEventListener("abort", abortForwarder);
    }
  }

  throw new ProviderExhaustedError(provider.key, lastError);
}

// ── Hedged race orchestrator ─────────────────────────────────────────────────

function pickBestError(errors) {
  const meaningful = errors.filter(Boolean);
  if (meaningful.length === 0) {
    return new Error("Unable to generate lesson after exhausting retries");
  }
  // Unwrap provider-exhausted wrappers so server.js sees the real cause.
  const unwrapped = meaningful.map((e) =>
    e instanceof ProviderExhaustedError && e.cause ? e.cause : e
  );
  // Prefer a concrete provider error over "circuit was open".
  const concrete = unwrapped.find((e) => !(e instanceof GemmaCircuitOpenError));
  return concrete ?? unwrapped[0];
}

/**
 * Race providers with COST-AWARE hedging:
 *  - launch the first (healthiest) provider immediately;
 *  - if it fails, launch the next one instantly (fail-fast);
 *  - if the hedge timer fires and NO running provider has shown any sign of
 *    life (no bytes received), launch the next one in parallel — but if the
 *    leader is alive and generating, DON'T: hedging a healthy provider only
 *    doubles token spend and burns the fallback's free-tier limits. A leader
 *    that goes quiet later is killed by the stream silence watchdog, which
 *    lands in the fail-fast path anyway;
 *  - first success wins, all other in-flight attempts are aborted.
 */
function hedgedRace(starters, hedgeDelayMs, onWinner, onHedgeSkipped) {
  return new Promise((resolve, reject) => {
    const errors = new Array(starters.length);
    let nextIndex = 0;
    let running = 0;
    let finished = false;
    let hedgeTimer = null;
    let anyAlive = false;

    const othersRunning = () => running > 1;
    const markAlive = () => {
      anyAlive = true;
    };

    const settleReject = () => {
      if (!finished && running === 0 && nextIndex >= starters.length) {
        finished = true;
        if (hedgeTimer) clearTimeout(hedgeTimer);
        reject(pickBestError(errors));
      }
    };

    const scheduleHedge = () => {
      if (finished || nextIndex >= starters.length) return;
      hedgeTimer = setTimeout(() => {
        if (finished) return;
        if (anyAlive) {
          // Leader is receiving data — rescue not needed, save the money.
          onHedgeSkipped?.();
          return;
        }
        launchNext();
      }, hedgeDelayMs);
    };

    const launchNext = () => {
      if (finished || nextIndex >= starters.length) return;
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = null;
      }
      const index = nextIndex++;
      running += 1;
      // A newly launched provider starts silent: reset the liveness flag so
      // its own hedge window judges IT, not the corpse of its predecessor.
      anyAlive = false;
      starters[index]({ othersRunning, markAlive }).then(
        (value) => {
          running -= 1;
          if (finished) return;
          finished = true;
          if (hedgeTimer) clearTimeout(hedgeTimer);
          onWinner?.(index);
          resolve(value);
        },
        (error) => {
          running -= 1;
          errors[index] = error;
          if (finished) return;
          // Fail-fast: a dead provider shouldn't make the user wait for the
          // hedge timer — bring in the next provider immediately.
          // (launchNext re-arms the hedge timer for any remaining starters.)
          launchNext();
          settleReject();
        }
      );
      scheduleHedge();
    };

    launchNext();
  });
}

// ── Public entrypoint ────────────────────────────────────────────────────────

export async function callGemma(
  systemPrompt,
  userMessage,
  enableSearch = true,
  temperature = 0.7,
  timeoutMs = 30000,
  signal = null,
  maxOutputTokens = 4000,
  allowFallback = true
) {
  const config = getEngineConfig();
  const providers = getProviders(allowFallback);

  if (providers.length === 0) {
    throw new Error(
      "CEREBRAS_API_KEY must be configured, or CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID for fallback-only mode"
    );
  }
  if (enableSearch) {
    console.warn(
      "[AI] enableSearch requested but web-search grounding is not supported; continuing without it"
    );
  }

  const callId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  lastUserRequestAt = Date.now();
  const sanitizedSystemPrompt = stripThinkingTags(systemPrompt);
  const messages = [
    { role: "system", content: sanitizedSystemPrompt },
    { role: "user", content: userMessage },
  ];

  // Circuit gate. Providers with open circuits are skipped — UNLESS that
  // would leave nothing to try, in which case we half-open-probe the provider
  // closest to recovery instead of failing the user with a "come back later".
  let candidates = providers.filter((p) => !isCircuitOpen(p.key));
  let halfOpenProbe = false;
  if (candidates.length === 0) {
    const soonest = [...providers].sort(
      (a, b) => providerHealth[a.key].openUntil - providerHealth[b.key].openUntil
    )[0];
    candidates = [soonest];
    halfOpenProbe = true;
  }
  const ordered = orderProviders(candidates);

  console.log("[AI] callGemma invoked", {
    callId,
    providerOrder: ordered.map((p) => p.key),
    halfOpenProbe,
    hedgeDelayMs: config.hedgeDelayMs,
    maxRetries: config.maxRetries,
    timeoutMs,
    temperature,
    maxOutputTokens,
    systemPromptLength: sanitizedSystemPrompt?.length ?? 0,
    userMessageLength: userMessage?.length ?? 0,
    health: getProviderHealthSnapshot(),
  });

  // Losers get aborted through this controller the moment a winner lands.
  const raceController = new AbortController();
  const abortRaceFromParent = () => raceController.abort();
  signal?.addEventListener("abort", abortRaceFromParent, { once: true });

  const request = {
    messages,
    temperature,
    maxOutputTokens,
    timeoutMs,
    callId,
    parentSignal: signal,
    raceSignal: raceController.signal,
  };

  const starters = ordered.map(
    (provider) => (raceState) =>
      runProviderAttempts(provider, request, config, raceState)
  );

  try {
    const text = await hedgedRace(
      starters,
      config.hedgeDelayMs,
      (index) => {
        console.log("[AI] callGemma success", {
          callId,
          winner: ordered[index].key,
        });
      },
      () => {
        console.log("[AI] hedge skipped — leader is alive and generating", {
          callId,
        });
      }
    );
    return text;
  } catch (error) {
    // Caller cancelled — surface the abort as-is.
    if (signal?.aborted && isAbortError(error)) throw error;

    console.error("[AI] callGemma exhausted all options", {
      callId,
      errorName: error?.name,
      errorMessage: error?.message,
      health: getProviderHealthSnapshot(),
    });

    // When every provider is unavailable AND circuits are open, tell the
    // caller when it's worth retrying.
    if (isGemmaServiceUnavailableError(error)) {
      const openTimes = providers
        .map((p) => providerHealth[p.key].openUntil)
        .filter((t) => t > Date.now());
      if (openTimes.length === providers.length && openTimes.length > 0) {
        throw new GemmaCircuitOpenError(Math.min(...openTimes) - Date.now());
      }
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", abortRaceFromParent);
    raceController.abort();
  }
}

// ── Warm-up ──────────────────────────────────────────────────────────────────

/**
 * Warm up the FALLBACK model (Cloudflare Workers AI) with a minimal request.
 * Cloudflare Workers AI unloads idle models quickly and can cold-start in
 * 10-30s, so we keep it warm with a tiny non-streaming ping.
 *
 * The PRIMARY (Cerebras) is intentionally NOT warmed: Cerebras has no
 * meaningful cold start, and pinging it 24/7 would only waste tokens for no
 * latency benefit.
 */
export async function warmUpModel() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    console.log("[AI] Warm-up skipped: Cloudflare (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN) not configured");
    return;
  }

  const models = getCloudflareModels();
  const model = models[0];
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;

  const callId = `warmup-${Date.now()}`;
  const startedAt = Date.now();
  const maxAttempts = 2;
  const warmupTimeoutMs = 60000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), warmupTimeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Hi" }],
          temperature: 0.7,
          max_tokens: 5,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startedAt;

      if (res.ok) {
        console.log("[AI] Fallback model (Cloudflare) warmed up successfully", {
          callId,
          latencyMs,
          attempt: attempt + 1,
        });
        return;
      }

      console.warn("[AI] Warm-up received non-OK status (non-fatal)", {
        callId,
        latencyMs,
        attempt: attempt + 1,
        status: res.status,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn("[AI] Warm-up attempt failed (non-fatal)", {
        callId,
        attempt: attempt + 1,
        latencyMs: Date.now() - startedAt,
        error: error?.message,
      });
    }
  }
}

// Periodic warm-up: ping the model at a regular interval to prevent cold
// starts. Cloudflare Workers AI unloads idle models quickly — production
// logs show the model going cold within 30-40 seconds.
//
// COST CONTROL: pinging 24/7 is ~960 inference calls/day even when nobody is
// using the site. Warm-up now only runs while there has been user activity
// within WARM_UP_IDLE_WINDOW_MS (default 15 min, boot counts as activity so
// the first visitors are covered). After an idle stretch the first request
// pays a cold start once — the silence watchdog + fallback rescue keep even
// that case bounded — and warm-up resumes automatically with the traffic.
const DEFAULT_WARM_UP_INTERVAL_MS = 90 * 1000;
const DEFAULT_WARM_UP_IDLE_WINDOW_MS = 15 * 60 * 1000;

// Updated on every callGemma invocation; initialized to "now" at boot.
let lastUserRequestAt = Date.now();

export function startPeriodicWarmUp(intervalMs) {
  const resolvedMs =
    Number.isFinite(intervalMs) && intervalMs > 0
      ? intervalMs
      : parsePositiveInt(
          process.env.GEMMA_WARM_UP_INTERVAL_MS,
          DEFAULT_WARM_UP_INTERVAL_MS
        );
  const idleWindowMs = parsePositiveInt(
    process.env.WARM_UP_IDLE_WINDOW_MS,
    DEFAULT_WARM_UP_IDLE_WINDOW_MS
  );

  let idleLogged = false;
  // Run the first warm-up immediately, then on the interval while active.
  warmUpModel();
  const handle = setInterval(() => {
    const idleForMs = Date.now() - lastUserRequestAt;
    if (idleForMs > idleWindowMs) {
      if (!idleLogged) {
        console.log("[AI] Warm-up paused — no user requests recently", {
          idleForMs,
          idleWindowMs,
        });
        idleLogged = true;
      }
      return;
    }
    idleLogged = false;
    warmUpModel();
  }, resolvedMs);
  handle.unref?.();
  console.log("[AI] Periodic warm-up started", {
    intervalMs: resolvedMs,
    idleWindowMs,
  });
  return handle;
}

// ── Tolerant JSON extraction from model output ──────────────────────────────

import { jsonrepair } from "jsonrepair";

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

  // Primary repair: `jsonrepair` is the well-established, battle-tested library
  // for repairing broken/truncated JSON from LLMs — it handles trailing
  // commas, unterminated strings/arrays/objects, and fence artifacts far more
  // robustly than a hand-rolled pipeline. We run it first; the bespoke pipeline
  // below stays as a final fallback for any shape jsonrepair doesn't cover.
  try {
    return JSON.parse(jsonrepair(cleaned));
  } catch {}

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
