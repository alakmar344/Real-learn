import { jsonrepair } from "jsonrepair";

// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider AI inference engine.
//
// Providers (all speak the OpenAI-compatible chat-completions dialect and are
// driven through ONE shared fetch/stream/watchdog path):
//   • "groq"       — Groq Cloud LPU, ultra-low-latency primary (sub-second TTFT).
//   • "mistral"    — Mistral AI, low-latency zero-cold-start first fallback.
//   • "nvidia"     — NVIDIA NIM, high-capacity 70B-class fallback.
//   • "cloudflare" — Cloudflare Workers AI, last-resort (tier 1) provider.
//
// Free/hosted providers are individually unreliable, so the engine is built
// around three ideas that together give the fastest answer that actually
// succeeds:
//
//   1. HEDGED RACING — the healthiest provider starts first; if it has shown
//      no sign of life within AI_HEDGE_DELAY_MS (or fails outright), the next
//      provider launches IN PARALLEL. First success wins, losers are aborted.
//      A provider that is alive and streaming is never hedged against, so
//      duplicate tokens are only spent on genuine rescues.
//
//   2. PER-PROVIDER CIRCUIT BREAKERS — repeated availability failures open
//      that provider's circuit for a cooldown so requests route straight to a
//      healthy provider. When EVERY circuit is open the engine half-open-
//      probes the provider closest to recovery instead of failing the user.
//
//   3. MODEL ROTATION — each provider carries an ordered model list. Hosted
//      models get rate-limited or delisted without notice; on a model-shaped
//      failure (400/404/429/…) the engine advances to the next model and
//      REMEMBERS the working one for subsequent requests. Groq additionally
//      gets per-model TPM-aware selection (see the token ledger below).
//
// Health (EWMA latency + consecutive failures) is tracked per provider and
// decides who starts first on the next request. All requests STREAM from the
// provider so silence watchdogs can kill a hung request in seconds instead of
// burning a full timeout.
// ─────────────────────────────────────────────────────────────────────────────

export const PRIMARY_AI_MODEL =
  process.env.GROQ_AI_MODEL || "qwen/qwen3.6-27b";
export const GROQ_SECONDARY_MODEL =
  process.env.GROQ_SECONDARY_MODEL || "openai/gpt-oss-20b";
export const GROQ_TERTIARY_MODEL =
  process.env.GROQ_TERTIARY_MODEL || "llama-3.1-8b-instant";

// SECURITY: hard ceiling on accumulated streamed characters. Providers are
// first-party and max_tokens bounds normal generation, but a misbehaving
// upstream that streams continuously (defeating the stall watchdog by always
// sending SOMETHING) could otherwise grow memory without limit. ~2M chars is
// far above any legitimate lesson.
const MAX_STREAM_CHARS = 2_000_000;

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
// Trip the circuit after 2 consecutive availability failures — a degraded
// provider fails EVERY call, so a higher threshold only burns more requests'
// latency budget before traffic reroutes.
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 2;
const DEFAULT_CIRCUIT_COOLDOWN_MS = 60000;
// How long the leading provider gets to itself before the next provider is
// considered for hedging. Groq and Mistral both have sub-second TTFT, so a
// leader with ZERO bytes after 2.5s is almost certainly stuck — hedging then
// costs duplicate tokens only when a rescue is genuinely needed.
const DEFAULT_HEDGE_DELAY_MS = 2500;
// Streaming watchdogs. A hung request is detected by SILENCE, not by burning
// the whole per-attempt timeout. First-byte budgets are PER PROVIDER: Groq
// and Mistral answer in well under a second when healthy, while Cloudflare
// Workers AI legitimately cold-starts for 10-30s. AI_FIRST_BYTE_TIMEOUT_MS
// (when set) overrides all of them.
const FIRST_BYTE_TIMEOUT_DEFAULTS_MS = {
  groq: 8000,
  mistral: 8000,
  nvidia: 20000,
  cloudflare: 35000,
};
const DEFAULT_STALL_TIMEOUT_MS = 15000;
const PARSE_JSON_LOG_PREVIEW_CHARS = 300;

// ── Errors (public API — routes map these to client messages) ───────────────
// User-facing copy here is deliberately NEUTRAL: no provider names, no
// internal mechanics ("circuit", "API", "upstream"). The learner experiences
// one RealLearn system regardless of which provider is behind it. The strings
// keep "try again"/"temporarily"/"timed out" wording because the frontend
// classifies retryability from those phrases.

export function formatAITimeoutMessage(timeoutMs) {
  const timeoutSeconds = Math.round(timeoutMs / 1000);
  return `This request timed out after ${timeoutSeconds} seconds. Please try again.`;
}

export class AIApiError extends Error {
  constructor(status, statusText, details, retryAfterMs) {
    super(`AI API error: ${status} ${statusText} - ${details}`);
    this.name = "AIApiError";
    this.status = status;
    this.statusText = statusText;
    this.details = details;
    this.retryAfterMs = retryAfterMs;
  }
}

export class AITimeoutError extends Error {
  constructor(timeoutMs) {
    super(formatAITimeoutMessage(timeoutMs));
    this.name = "AITimeoutError";
  }
}

export class AICircuitOpenError extends Error {
  constructor(retryAfterMs) {
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    const secondsLabel = retryAfterSeconds === 1 ? "second" : "seconds";
    super(
      `Lesson generation is temporarily unavailable. Please try again in about ${retryAfterSeconds} ${secondsLabel}.`
    );
    this.name = "AICircuitOpenError";
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
  const firstByteOverride = parsePositiveInt(
    process.env.AI_FIRST_BYTE_TIMEOUT_MS,
    0
  );
  return {
    maxRetries: parseNonNegativeInt(
      process.env.AI_MAX_RETRIES,
      DEFAULT_MAX_RETRIES
    ),
    retryDelayMs: parseNonNegativeInt(
      process.env.AI_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    ),
    maxRetryDelayMs: parseNonNegativeInt(
      process.env.AI_MAX_RETRY_DELAY_MS,
      DEFAULT_MAX_RETRY_DELAY_MS
    ),
    circuitFailureThreshold: parsePositiveInt(
      process.env.AI_TIMEOUT_CIRCUIT_FAILURE_THRESHOLD,
      DEFAULT_CIRCUIT_FAILURE_THRESHOLD
    ),
    circuitCooldownMs: parsePositiveInt(
      process.env.AI_TIMEOUT_CIRCUIT_COOLDOWN_MS,
      DEFAULT_CIRCUIT_COOLDOWN_MS
    ),
    hedgeDelayMs: parseNonNegativeInt(
      process.env.AI_HEDGE_DELAY_MS,
      DEFAULT_HEDGE_DELAY_MS
    ),
    // 0 = "no global override; use the per-provider default".
    firstByteOverrideMs: firstByteOverride > 0 ? firstByteOverride : 0,
    stallTimeoutMs: parseNonNegativeInt(
      process.env.AI_STALL_TIMEOUT_MS,
      DEFAULT_STALL_TIMEOUT_MS
    ),
  };
}

// ── Groq per-model sliding 60s TPM ledger ────────────────────────────────────
// Groq rate-limits free/standard tiers with PER-MODEL tokens-per-minute
// envelopes. The engine keeps a rolling 60s token ledger PER MODEL and picks
// the preferred (healthy, warm) model while it has TPM headroom, rotating to
// the model with the most headroom only when the preferred one is close to
// its limit. This preserves latency affinity (the known-good model keeps
// serving) while spreading load across models exactly when it matters —
// instead of blind round-robin, which sent every Nth request to a colder or
// broken model for no reason.

const DEFAULT_GROQ_TPM_LIMIT = 8000;
const DEFAULT_GROQ_TPM_SAFETY_THRESHOLD = 6800;
const TPM_WINDOW_MS = 60000;

const groqTokenLedgers = new Map(); // model -> [{ timestamp, tokens }]

function groqTpmLimit() {
  return parsePositiveInt(process.env.GROQ_TPM_LIMIT, DEFAULT_GROQ_TPM_LIMIT);
}

function groqTpmSafetyThreshold() {
  return parsePositiveInt(
    process.env.GROQ_TPM_SAFETY_THRESHOLD,
    DEFAULT_GROQ_TPM_SAFETY_THRESHOLD
  );
}

function pruneLedger(ledger, now) {
  const cutoff = now - TPM_WINDOW_MS;
  while (ledger.length > 0 && ledger[0].timestamp < cutoff) {
    ledger.shift();
  }
}

export function recordGroqTokens(model, tokens, now = Date.now()) {
  if (typeof tokens !== "number" || !Number.isFinite(tokens) || tokens <= 0) return;
  const key = String(model || "unknown");
  let ledger = groqTokenLedgers.get(key);
  if (!ledger) {
    ledger = [];
    groqTokenLedgers.set(key, ledger);
  }
  pruneLedger(ledger, now);
  ledger.push({ timestamp: now, tokens: Math.round(tokens) });
}

export function getRollingGroqTpmUsage(model, now = Date.now()) {
  const ledger = groqTokenLedgers.get(String(model || "unknown"));
  if (!ledger) return 0;
  pruneLedger(ledger, now);
  return ledger.reduce((sum, entry) => sum + entry.tokens, 0);
}

export function isGroqTpmNearLimit(model, estimatedTokens = 600, now = Date.now()) {
  return (
    getRollingGroqTpmUsage(model, now) + estimatedTokens >= groqTpmSafetyThreshold()
  );
}

export function resetGroqTokenLedger() {
  groqTokenLedgers.clear();
}

/**
 * TPM-aware Groq model selection: stick with the preferred (pinned-healthy)
 * model while it has rolling-window headroom for this request; otherwise pick
 * the configured model with the most remaining headroom.
 */
export function selectGroqModel(models, preferredIndex = 0, estimatedTokens = 600) {
  if (!Array.isArray(models) || models.length === 0) {
    return { model: PRIMARY_AI_MODEL, index: 0, reason: "default" };
  }
  const start = ((preferredIndex % models.length) + models.length) % models.length;
  const preferred = models[start];
  if (!isGroqTpmNearLimit(preferred, estimatedTokens)) {
    return { model: preferred, index: start, reason: "preferred" };
  }
  let bestIndex = start;
  let bestUsage = Infinity;
  for (let offset = 1; offset < models.length; offset++) {
    const index = (start + offset) % models.length;
    const usage = getRollingGroqTpmUsage(models[index]);
    if (usage + estimatedTokens < groqTpmSafetyThreshold()) {
      console.log("[AI] Groq TPM rotation", {
        from: preferred,
        to: models[index],
        preferredUsage: getRollingGroqTpmUsage(preferred),
        estimatedTokens,
      });
      return { model: models[index], index, reason: "tpm_rotation" };
    }
    if (usage < bestUsage) {
      bestUsage = usage;
      bestIndex = index;
    }
  }
  // Every model is near its limit — use the least-loaded one rather than
  // refusing (the provider will 429 if it truly has no budget, and the
  // race/rotation machinery handles that).
  return { model: models[bestIndex], index: bestIndex, reason: "least_loaded" };
}

// Rough estimator (1 token ≈ 3.5 chars). Completions rarely use the whole
// max_tokens budget, so count half of it for the TPM headroom check.
function estimateRequestTokens(messages, maxOutputTokens) {
  const promptChars = (messages || []).reduce(
    (acc, m) => acc + (typeof m.content === "string" ? m.content.length : 0),
    0
  );
  return Math.ceil(promptChars / 3.5) + Math.ceil((maxOutputTokens || 0) / 2);
}

// ── Text utilities ───────────────────────────────────────────────────────────

// Reasoning-tuned models (gpt-oss, deepseek-r1 distills) can leak <think>
// blocks into content; strip them so they never reach parsing or the user.
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

function isRetryableNetworkError(error) {
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
    // when the connection drops while the response body is being read.
    message.includes("terminated") ||
    message.includes("other side closed") ||
    message.includes("premature close") ||
    message.includes("input stream")
  );
}

function isRetryableAIError(error, hasFallbackModels = false) {
  if (error instanceof AITimeoutError) return true;
  if (error instanceof AIApiError) {
    // 408 = upstream request timeout (transient), 429 = rate limit
    // (transient), 403 = provider tier limiting (transient),
    // 402 = payment/credits limit (transient/rotatable), 5xx = server error.
    if (
      error.status === 408 ||
      error.status === 429 ||
      error.status === 403 ||
      error.status === 402 ||
      (error.status >= 500 && error.status < 600)
    ) {
      return true;
    }
    if (hasFallbackModels && isModelRotationFailure(error)) {
      return true;
    }
    // Some providers report transient stream failures with a non-retryable-
    // looking status code; match on the upstream message.
    const details = String(error.details ?? "").toLowerCase();
    return details.includes("input stream") || details.includes("timed out");
  }
  return isRetryableNetworkError(error);
}

// Failures that indicate the PROVIDER is unavailable (feeds the circuit
// breaker). Auth/validation errors do not count — the provider answered.
function isAvailabilityFailure(error) {
  return (
    error instanceof AITimeoutError ||
    (error instanceof AIApiError &&
      (error.status === 408 ||
        error.status === 429 ||
        error.status === 403 ||
        error.status === 402 ||
        error.status >= 500)) ||
    isRetryableNetworkError(error)
  );
}

// A model-shaped failure: this specific model is missing/invalid/throttled/
// unsupported on tier. Worth rotating to the next model in the list.
function isModelRotationFailure(error) {
  return (
    error instanceof AIApiError &&
    (error.status === 400 ||
      error.status === 401 ||
      error.status === 402 ||
      error.status === 403 ||
      error.status === 404 ||
      error.status === 422 ||
      error.status === 429)
  );
}

function isAIServiceUnavailableError(error) {
  return error instanceof AICircuitOpenError || isAvailabilityFailure(error);
}

function isAbortError(error) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      (typeof error.message === "string" && /\baborted\b/i.test(error.message)))
  );
}

function newAbortError() {
  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";
  return abortError;
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
  groq: newProviderHealth(),
  mistral: newProviderHealth(),
  nvidia: newProviderHealth(),
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

/**
 * True when EVERY configured provider's circuit is currently open — i.e. a
 * total generation outage. Used by /health to report the service as degraded
 * (503) so uptime monitors see the outage instead of a green Mongo ping.
 */
export function allCircuitsOpen() {
  const providers = getProviders();
  if (providers.length === 0) return false;
  return providers.every((provider) => isCircuitOpen(provider.key));
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
  for (const key of Object.keys(providerHealth)) {
    providerHealth[key] = newProviderHealth();
  }
}

// ── Provider registry ────────────────────────────────────────────────────────

function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function isMistralConfigured() {
  return Boolean(process.env.MISTRAL_API_KEY?.trim());
}

function isNvidiaConfigured() {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
}

function isCloudflareConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  );
}

export function getGroqModels() {
  const configured = [
    PRIMARY_AI_MODEL,
    GROQ_SECONDARY_MODEL,
    GROQ_TERTIARY_MODEL,
    ...parseModelList(process.env.GROQ_AI_MODELS),
    ...parseModelList(process.env.GROQ_FALLBACK_MODELS),
  ];
  return [...new Set(configured.filter(Boolean))];
}

export function getMistralModels() {
  const configured = [
    ...parseModelList(process.env.MISTRAL_AI_MODEL),
    ...parseModelList(process.env.MISTRAL_AI_MODELS),
  ];
  if (configured.length === 0) {
    // Text-generation models only — code/vision specialists (codestral,
    // pixtral) have no business writing lessons.
    configured.push(
      "mistral-small-latest",
      "open-mistral-nemo",
      "mistral-large-latest"
    );
  }
  return [...new Set(configured)];
}

function getNvidiaModels() {
  const models = [
    ...parseModelList(process.env.NVIDIA_AI_MODEL),
    ...parseModelList(process.env.NVIDIA_AI_MODELS),
  ];
  if (models.length === 0) {
    models.push(
      "meta/llama-3.3-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "mistralai/mistral-large-2-instruct",
      "qwen/qwen2.5-72b-instruct",
      "meta/llama-3.1-8b-instruct"
    );
  }
  return [...new Set(models)];
}

function getCloudflareModels() {
  const models = [
    ...parseModelList(process.env.CLOUDFLARE_AI_MODEL),
    ...parseModelList(process.env.CLOUDFLARE_AI_MODELS),
  ];
  if (models.length === 0) {
    models.push(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-3.1-70b-instruct",
      "@cf/qwen/qwen2.5-72b-instruct"
    );
  }
  return [...new Set(models)];
}

function getProviders() {
  const providers = [];
  if (isGroqConfigured()) {
    providers.push({
      key: "groq",
      // tier 0 = normal racing pool (ordered by health/latency within a tier)
      tier: 0,
      models: getGroqModels(),
      firstByteTimeoutMs: FIRST_BYTE_TIMEOUT_DEFAULTS_MS.groq,
      call: callGroq,
    });
  }
  if (isMistralConfigured()) {
    providers.push({
      key: "mistral",
      tier: 0,
      models: getMistralModels(),
      firstByteTimeoutMs: FIRST_BYTE_TIMEOUT_DEFAULTS_MS.mistral,
      call: callMistral,
    });
  }
  if (isNvidiaConfigured()) {
    providers.push({
      key: "nvidia",
      tier: 0,
      models: getNvidiaModels(),
      firstByteTimeoutMs: FIRST_BYTE_TIMEOUT_DEFAULTS_MS.nvidia,
      call: callNvidia,
    });
  }
  if (isCloudflareConfigured()) {
    providers.push({
      key: "cloudflare",
      tier: 1,
      models: getCloudflareModels(),
      firstByteTimeoutMs: FIRST_BYTE_TIMEOUT_DEFAULTS_MS.cloudflare,
      call: callCloudflare,
    });
  }
  return providers;
}

// Healthiest first WITHIN a tier: closed circuits before open ones, then the
// last-resort tier behind the normal pool, then lowest observed latency, then
// registry order (Groq first) as a stable tiebreak.
function orderProviders(providers) {
  return [...providers].sort((a, b) => {
    const openA = isCircuitOpen(a.key) ? 1 : 0;
    const openB = isCircuitOpen(b.key) ? 1 : 0;
    if (openA !== openB) return openA - openB;
    const tierA = a.tier ?? 0;
    const tierB = b.tier ?? 0;
    if (tierA !== tierB) return tierA - tierB;
    const latencyA = providerHealth[a.key].ewmaLatencyMs ?? Infinity;
    const latencyB = providerHealth[b.key].ewmaLatencyMs ?? Infinity;
    if (latencyA !== latencyB) return latencyA - latencyB;
    return 0;
  });
}

// ── HTTP layer (shared by every provider) ────────────────────────────────────

function parseRetryAfterMs(response) {
  const header = response.headers.get("Retry-After");
  if (typeof header !== "string" || !header.trim()) return undefined;
  const parsed = Number(header);
  if (Number.isFinite(parsed) && parsed > 0) return parsed * 1000;
  // RFC 7231 also allows an HTTP-date form; convert to a delay from now.
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return undefined;
}

async function readErrorDetails(response, contentType) {
  try {
    if (contentType.includes("application/json")) {
      const errBody = await response.json();
      // Cap like the text branch — an upstream error body can be huge and
      // would otherwise land whole in error messages and every log line.
      return String(
        errBody.errors?.[0]?.message ||
          errBody.error?.message ||
          (typeof errBody.error === "string" ? errBody.error : null) ||
          JSON.stringify(errBody)
      ).slice(0, 500);
    }
    return (await response.text()).slice(0, 500);
  } catch {
    return response.statusText;
  }
}

// Fetch a chat completion with a SILENCE WATCHDOG. `opts.onActivity` fires on
// every sign of life (each stream chunk) — the race orchestrator uses it to
// skip hedging a provider that is alive and generating. If the provider goes
// silent past the watchdog windows, the request is aborted and surfaced as a
// retryable 408 so retries/fallback kick in within seconds instead of burning
// the full per-attempt timeout.
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
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // Headers only reset the watchdog; "alive" (hedge-skipping) is reserved
    // for HEALTHY BODY BYTES — an error reply is not a generation in
    // progress, and neither is a 200 whose body never arrives (a provider
    // that accepts the stream and then goes silent must still be hedged
    // against, not trusted because it sent headers).
    armWatchdog(stallTimeoutMs);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const retryAfterMs = parseRetryAfterMs(response);
      const details = await readErrorDetails(response, contentType);
      throw new AIApiError(response.status, response.statusText, details, retryAfterMs);
    }

    if (contentType.includes("text/event-stream")) {
      return await handleStreamingResponse(response, activity);
    }
    activity();

    if (!contentType.includes("application/json")) {
      return await response.text();
    }

    const data = await response.json();
    if (data.error) {
      // Some providers put a non-numeric string in error.code. Coerce to a
      // finite number (falling back to 500) so the retry/rotation/circuit
      // classifiers see a real status instead of a string that fails every
      // comparison and makes a transient error look non-retryable.
      const rawCode = Number(data.error.code);
      const statusCode = Number.isFinite(rawCode) ? rawCode : 500;
      throw new AIApiError(
        statusCode,
        "APIError",
        data.error.message || JSON.stringify(data.error),
        parseRetryAfterMs(response)
      );
    }
    return data;
  } catch (error) {
    // Release the upstream connection when the body wasn't fully consumed
    // (mid-stream error payload, overflow); abort is idempotent.
    controller.abort();
    if (watchdogFired && isAbortError(error)) {
      // 408 keeps this on the retryable/rotate/circuit path.
      const stallError = new AIApiError(
        408,
        "StallTimeout",
        `provider sent no data for ${watchdogAtMs}ms (silence watchdog)`
      );
      // A stall AFTER data flowed is a dead connection, not a cold start —
      // the retry scheduler must not sit out the cold-start backoff window.
      stallError.receivedData = receivedData;
      throw stallError;
    }
    throw error;
  } finally {
    disarmWatchdog();
    signal?.removeEventListener("abort", forwardAbort);
  }
}

// Providers can report a mid-stream failure (e.g. 408 "error in input
// stream") as an error payload INSIDE the SSE stream rather than as an HTTP
// error status. Detect it and throw a retryable AIApiError instead of
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
  // Exact token accounting when the provider reports it: Groq attaches usage
  // to the final chunk under x_groq; OpenAI-compatible streams may use a
  // top-level usage field.
  let usage = null;

  const consumePayload = (payload) => {
    if (payload === "[DONE]") return;
    try {
      const chunk = JSON.parse(payload);
      const streamError = extractStreamChunkError(chunk);
      if (streamError) {
        // 408 keeps this on the retryable path (see isRetryableAIError).
        throw new AIApiError(408, "StreamError", streamError);
      }
      if (chunk.x_groq?.usage?.total_tokens) {
        usage = chunk.x_groq.usage;
      } else if (chunk.usage?.total_tokens) {
        usage = chunk.usage;
      }
      const token =
        chunk.choices?.[0]?.delta?.content ??
        chunk.choices?.[0]?.message?.content ??
        chunk.response ??
        "";
      fullText += token;
      if (fullText.length > MAX_STREAM_CHARS) {
        throw new AIApiError(
          408,
          "StreamOverflow",
          `provider stream exceeded ${MAX_STREAM_CHARS} characters`
        );
      }
    } catch (error) {
      if (error instanceof AIApiError) throw error;
      // Non-JSON keep-alive/comment lines are safe to ignore.
    }
  };

  try {
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
  } catch (error) {
    // A mid-stream throw abandons the reader; without cancel() the upstream
    // connection stays open (~minutes) on every retried failure.
    void reader.cancel().catch(() => {});
    throw error;
  }

  return { choices: [{ message: { content: fullText } }], usage };
}

// ── Provider callers (thin payload builders on the shared HTTP layer) ────────

// vLLM-style reasoning toggle for providers that support it. Groq and Mistral
// reject unknown kwargs with a 400, so this NEVER applies to them.
//   AI_DISABLE_THINKING = off (default) | nvidia | cloudflare | all
function thinkingDisabledFor(providerKey) {
  const mode = (process.env.AI_DISABLE_THINKING || "off").trim().toLowerCase();
  if (mode === "off" || !mode) return false;
  return mode === "all" || mode === "both" || mode === providerKey;
}

// Mistral structured output: response_format json_object is documented,
// streaming-compatible, and eliminates markdown-fenced / prose-wrapped JSON
// at the source — which is what used to burn repair attempts. Kill switch:
// MISTRAL_JSON_MODE=off (in case a future model rejects the field).
function mistralJsonModeEnabled() {
  const raw = (process.env.MISTRAL_JSON_MODE || "on").trim().toLowerCase();
  return !["off", "false", "0", "no"].includes(raw);
}

function callGroq(model, body, signal, opts) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  const payload = {
    model,
    messages: body.messages,
    temperature: body.temperature,
    // Groq's canonical name for the completion budget.
    max_completion_tokens: body.max_tokens,
    // Streaming enables the silence watchdogs and exact per-chunk liveness.
    stream: true,
  };
  return fetchChatCompletion(
    "https://api.groq.com/openai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    payload,
    signal,
    opts
  );
}

function callMistral(model, body, signal, opts) {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY is not configured");
  }
  const payload = {
    model,
    messages: body.messages,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    stream: true,
  };
  if (mistralJsonModeEnabled()) {
    payload.response_format = { type: "json_object" };
  }
  return fetchChatCompletion(
    "https://api.mistral.ai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    payload,
    signal,
    opts
  );
}

function callNvidia(model, body, signal, opts) {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }
  const payload = {
    model,
    messages: body.messages,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    stream: true,
  };
  if (thinkingDisabledFor("nvidia")) {
    payload.chat_template_kwargs = { enable_thinking: false };
  }
  return fetchChatCompletion(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    payload,
    signal,
    opts
  );
}

function callCloudflare(model, body, signal, opts) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!apiToken || !accountId) {
    throw new Error("CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID is not configured");
  }
  const payload = {
    model,
    messages: body.messages,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
    stream: true,
  };
  if (thinkingDisabledFor("cloudflare")) {
    payload.chat_template_kwargs = { enable_thinking: false };
  }
  return fetchChatCompletion(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
    { Authorization: `Bearer ${apiToken}` },
    payload,
    signal,
    opts
  );
}

// ── Result extraction ────────────────────────────────────────────────────────

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
    throw new AIApiError(
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
  const models = provider.models.length > 0 ? provider.models : [PRIMARY_AI_MODEL];
  const firstByteTimeoutMs =
    config.firstByteOverrideMs || provider.firstByteTimeoutMs;
  let lastError = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (parentSignal?.aborted || raceSignal?.aborted) {
      throw newAbortError();
    }

    // Start from the provider's CURRENT preferred model — rotation on a
    // model-shaped failure advances it, and success pins it for next time.
    // Groq additionally consults the per-model TPM ledger so a model that is
    // about to hit its tokens-per-minute envelope is sidestepped BEFORE it
    // 429s, not after.
    let modelIndex = health.modelIndex % models.length;
    let model = models[modelIndex];
    if (provider.key === "groq") {
      const selection = selectGroqModel(
        models,
        modelIndex,
        estimateRequestTokens(messages, maxOutputTokens)
      );
      model = selection.model;
      modelIndex = selection.index;
    }

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
          firstByteTimeoutMs,
          stallTimeoutMs: config.stallTimeoutMs,
          // Liveness signal for the race orchestrator: a provider that is
          // receiving data must not be hedged against (cost control).
          onActivity: () => raceState?.markAlive?.(),
        }
      );
      const text = extractTextFromResult(result);

      const latencyMs = Date.now() - startedAt;
      recordProviderSuccess(provider.key, latencyMs, modelIndex);
      if (provider.key === "groq") {
        // Exact usage when Groq reported it in the stream; estimate otherwise.
        const totalTokens =
          result?.usage?.total_tokens ||
          estimateRequestTokens(messages, 0) + Math.ceil(text.length / 3.5);
        recordGroqTokens(model, totalTokens);
      }
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
          error = new AITimeoutError(timeoutMs);
        } else {
          // Aborted by the caller or because another provider already won —
          // propagate untouched; the orchestrator ignores race-cancellations.
          throw rawError;
        }
      }

      lastError = error;
      recordProviderFailure(provider.key, error, config);
      if (provider.key === "groq" && error?.status === 429) {
        // The provider says this model's minute budget is gone — mark its
        // ledger full so TPM-aware selection steers the next requests away
        // until the window rolls over.
        recordGroqTokens(model, groqTpmLimit());
      }
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
      const canRotate = models.length > 1 && isModelRotationFailure(error);
      if (isLastAttempt || (!isRetryableAIError(error, models.length > 1) && !canRotate)) {
        throw new ProviderExhaustedError(provider.key, error);
      }

      // Backoff before the next attempt. Timeouts on Cloudflare/NVIDIA can
      // mean a cold model — wait long enough for it to load, unless another
      // provider is racing (then keep the loser's retries cheap and quick).
      // Model-rotation switches don't require waiting for server recovery,
      // so cap their backoff near-zero.
      const isColdStart =
        (error instanceof AITimeoutError ||
          (error instanceof AIApiError && error.status === 408)) &&
        !error.receivedData;
      const racing = raceState?.othersRunning?.() ?? false;
      const isRotation = isModelRotationFailure(error);
      const baseDelay = isRotation
        ? 50
        : isColdStart
          ? COLD_START_RETRY_DELAY_MS
          : config.retryDelayMs;
      const cap = isRotation
        ? 200
        : racing
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
  // Unwrap provider-exhausted wrappers so callers see the real cause.
  const unwrapped = meaningful.map((e) =>
    e instanceof ProviderExhaustedError && e.cause ? e.cause : e
  );
  // Prefer a concrete provider error over "circuit was open".
  const concrete = unwrapped.find((e) => !(e instanceof AICircuitOpenError));
  return concrete ?? unwrapped[0];
}

/**
 * Race providers with COST-AWARE hedging:
 *  - launch the first (healthiest) provider immediately;
 *  - if it fails, launch the next one instantly (fail-fast);
 *  - if the hedge timer fires and NO running provider has shown any sign of
 *    life (no bytes received), launch the next one in parallel — but if any
 *    running provider is alive and generating, DON'T: hedging a healthy
 *    provider only doubles token spend. A leader that goes quiet later is
 *    killed by the stream silence watchdog, which lands in the fail-fast
 *    path anyway;
 *  - first success wins, all other in-flight attempts are aborted.
 *
 * Liveness is tracked PER STARTER (not as one shared flag) so a dead
 * provider's exit never erases — or a corpse never fakes — the liveness of a
 * provider that is still streaming.
 */
function hedgedRace(starters, hedgeDelayMs, onWinner, onHedgeSkipped) {
  return new Promise((resolve, reject) => {
    const errors = new Array(starters.length);
    const aliveIndices = new Set();
    let nextIndex = 0;
    let running = 0;
    let finished = false;
    let hedgeTimer = null;

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
        if (aliveIndices.size > 0) {
          // A running provider is receiving data — rescue not needed.
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
      starters[index]({
        othersRunning: () => running > 1,
        markAlive: () => aliveIndices.add(index),
      }).then(
        (value) => {
          running -= 1;
          aliveIndices.delete(index);
          if (finished) return;
          finished = true;
          if (hedgeTimer) clearTimeout(hedgeTimer);
          onWinner?.(index);
          resolve(value);
        },
        (error) => {
          running -= 1;
          aliveIndices.delete(index);
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

/**
 * Generate one chat completion across the provider pool. Resolves with the
 * completion TEXT (thinking tags stripped); rejects with AIApiError /
 * AITimeoutError / AICircuitOpenError / AbortError.
 */
export async function callAI(
  systemPrompt,
  userMessage,
  temperature = 0.7,
  timeoutMs = 30000,
  signal = null,
  maxOutputTokens = 4000
) {
  const config = getEngineConfig();
  const providers = getProviders();

  if (providers.length === 0) {
    throw new Error(
      "No AI provider is configured: set GROQ_API_KEY, MISTRAL_API_KEY, NVIDIA_API_KEY, or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID"
    );
  }

  const callId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const messages = [
    { role: "system", content: systemPrompt },
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

  console.log("[AI] callAI invoked", {
    callId,
    providerOrder: ordered.map((p) => p.key),
    halfOpenProbe,
    timeoutMs,
    maxOutputTokens,
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
    return await hedgedRace(
      starters,
      config.hedgeDelayMs,
      (index) => {
        console.log("[AI] callAI success", { callId, winner: ordered[index].key });
      },
      () => {
        console.log("[AI] hedge skipped — leader is alive and generating", { callId });
      }
    );
  } catch (error) {
    // Caller cancelled — surface the abort as-is.
    if (signal?.aborted && isAbortError(error)) throw error;

    console.error("[AI] callAI exhausted all options", {
      callId,
      errorName: error?.name,
      errorMessage: error?.message,
    });

    // When every provider is unavailable AND circuits are open, tell the
    // caller when it's worth retrying.
    if (isAIServiceUnavailableError(error)) {
      const openTimes = providers
        .map((p) => providerHealth[p.key].openUntil)
        .filter((t) => t > Date.now());
      if (openTimes.length === providers.length && openTimes.length > 0) {
        throw new AICircuitOpenError(Math.min(...openTimes) - Date.now());
      }
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", abortRaceFromParent);
    raceController.abort();
  }
}

// ── Boot-time connection warm-up ─────────────────────────────────────────────
// Groq and Mistral have no model cold start, so there is nothing to keep warm
// with inference pings (the old periodic Cloudflare warm-up burned ~700
// inference calls/day for a last-resort provider). What IS worth paying once,
// at boot, is the DNS + TCP + TLS handshake to each configured provider:
// undici keeps the pooled connection alive, so the first real user request
// skips the handshake and reaches the provider faster.

const PROVIDER_ORIGINS = [
  { key: "groq", origin: "https://api.groq.com", enabled: isGroqConfigured },
  { key: "mistral", origin: "https://api.mistral.ai", enabled: isMistralConfigured },
  { key: "nvidia", origin: "https://integrate.api.nvidia.com", enabled: isNvidiaConfigured },
  { key: "cloudflare", origin: "https://api.cloudflare.com", enabled: isCloudflareConfigured },
];

export function preconnectProviders() {
  for (const { key, origin, enabled } of PROVIDER_ORIGINS) {
    if (!enabled()) continue;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    // No auth header and no body: any HTTP status (404, 401, …) still means
    // the TLS session is established and pooled. Fire-and-forget.
    fetch(origin, { method: "GET", signal: controller.signal })
      .then((res) => {
        void res.body?.cancel().catch(() => {});
        console.log("[AI] preconnect ok", { provider: key, status: res.status });
      })
      .catch(() => {
        // Purely opportunistic; a failure here means nothing for real calls.
      })
      .finally(() => clearTimeout(timeoutId));
  }
}

// ── Tolerant JSON extraction from model output ──────────────────────────────

export function parseJSON(text) {
  // Prefix/fence strips are anchored to the ends of the text — unanchored
  // (global/multiline) replaces also deleted fences and "Reasoning:" labels
  // from INSIDE JSON string values, corrupting lessons that quote them.
  let cleaned = text
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "")
    .trim()
    .replace(/^(?:thinking|thought|reasoning)\s*:\s*/i, "")
    .trim();
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

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

  try {
    return JSON.parse(jsonrepair(cleaned));
  } catch (error) {
    console.error("[parseJSON] Repair failed", {
      preview: text.slice(0, PARSE_JSON_LOG_PREVIEW_CHARS),
      rawLength: text.length,
      error: error?.message,
    });
    return null;
  }
}
