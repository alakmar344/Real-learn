import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.CLOUDFLARE_API_TOKEN = "test-token";
process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
process.env.FALLBACK_AI_URL = "https://openrouter.ai/api/v1/chat/completions";
process.env.FALLBACK_AI_API_KEY = "test-key";
process.env.FALLBACK_AI_MODEL = "m1:free";
process.env.FALLBACK_AI_MODELS = "m1:free,m2:free";
process.env.AI_HEDGE_DELAY_MS = "80";
process.env.GEMMA_MAX_RETRIES = "1";
process.env.GEMMA_RETRY_DELAY_MS = "20";
process.env.GEMMA_MAX_RETRY_DELAY_MS = "50";

const {
  callGemma,
  parseJSON,
  extractTextFromResult,
  getProviderHealthSnapshot,
  resetProviderHealth,
  GemmaApiError,
} = await import("../src/lib/gemma.js");

const originalFetch = globalThis.fetch;
let scenario = null;

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
const okResponse = (text) =>
  jsonResponse({ choices: [{ message: { content: text } }] });

// Build a mock SSE response that emits chunks on a schedule. Wires the abort
// signal like a real fetch: aborting errors the stream so pending reads
// reject (this is how the silence watchdog interrupts a stalled body).
function sseResponse(signal, steps, { close = true } = {}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let latest = 0;
      for (const step of steps) {
        latest = Math.max(latest, step.at);
        setTimeout(() => {
          try {
            controller.enqueue(encoder.encode(step.data));
          } catch {}
        }, step.at);
      }
      if (close) {
        setTimeout(() => {
          try {
            controller.close();
          } catch {}
        }, latest + 20);
      }
      signal?.addEventListener("abort", () => {
        try {
          const abortError = new Error("aborted");
          abortError.name = "AbortError";
          controller.error(abortError);
        } catch {}
      });
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}
const sseChunk = (text) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;

beforeEach(() => {
  resetProviderHealth();
  globalThis.fetch = async (url, opts) =>
    scenario(String(url).includes("cloudflare.com"), opts);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("healthy primary wins without touching the fallback", async () => {
  let fallbackCalls = 0;
  scenario = async (isCloudflare) => {
    if (isCloudflare) return okResponse("primary-answer");
    fallbackCalls += 1;
    return okResponse("fallback-answer");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "primary-answer");
  assert.equal(fallbackCalls, 0);
});

test("slow primary is hedged: fallback launches in parallel and wins", async () => {
  scenario = (isCloudflare, opts) =>
    new Promise((resolve, reject) => {
      if (isCloudflare) {
        const timer = setTimeout(() => resolve(okResponse("slow")), 3000);
        opts.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          const abortError = new Error("aborted");
          abortError.name = "AbortError";
          reject(abortError);
        });
      } else {
        setTimeout(() => resolve(okResponse("fast-fallback")), 20);
      }
    });
  const startedAt = Date.now();
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "fast-fallback");
  // hedge delay (80ms) + fallback latency (20ms) + slack — never the 3s primary
  assert.ok(Date.now() - startedAt < 1000);
});

test("failing primary triggers immediate fail-fast fallback (no hedge wait)", async () => {
  scenario = async (isCloudflare) => {
    if (isCloudflare) return jsonResponse({ errors: [{ message: "boom" }] }, 500);
    return okResponse("fallback-answer");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "fallback-answer");
});

test("fallback rotates to the next free model on 429", async () => {
  const seenModels = [];
  scenario = async (isCloudflare, opts) => {
    if (isCloudflare) return jsonResponse({ errors: [{ message: "down" }] }, 500);
    const body = JSON.parse(opts.body);
    seenModels.push(body.model);
    if (body.model === "m1:free") {
      return jsonResponse({ error: { message: "rate limited" } }, 429);
    }
    return okResponse("rotated-answer");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "rotated-answer");
  assert.deepEqual(seenModels, ["m1:free", "m2:free"]);
  // The working model is remembered for the next request.
  assert.equal(getProviderHealthSnapshot().fallback.preferredModelIndex, 1);
});

test("total outage opens both circuits and surfaces a retryable error", async () => {
  scenario = async () => jsonResponse({ errors: [{ message: "dead" }] }, 500);
  await assert.rejects(() => callGemma("sys", "user", false, 0.5, 5000));
  const snapshot = getProviderHealthSnapshot();
  assert.equal(snapshot.cloudflare.circuitOpen, true);
  assert.equal(snapshot.fallback.circuitOpen, true);
});

test("open circuits still half-open-probe instead of refusing outright", async () => {
  scenario = async () => jsonResponse({ errors: [{ message: "dead" }] }, 500);
  await assert.rejects(() => callGemma("sys", "user", false, 0.5, 5000));

  // Provider recovers — the next call must probe it, not throw CircuitOpen.
  let probed = 0;
  scenario = async () => {
    probed += 1;
    return okResponse("recovered");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "recovered");
  assert.equal(probed, 1);
});

test("hedge is SKIPPED while the leader is streaming (no fallback spend)", async () => {
  let fallbackCalls = 0;
  scenario = (isCloudflare, opts) => {
    if (isCloudflare) {
      // First chunk at 20ms (before the 80ms hedge), finishes at 250ms
      // (after the hedge would have fired).
      return sseResponse(opts.signal, [
        { at: 20, data: sseChunk("slow ") },
        { at: 250, data: sseChunk("but alive") },
      ]);
    }
    fallbackCalls += 1;
    return okResponse("should-never-run");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "slow but alive");
  assert.equal(fallbackCalls, 0);
});

test("silence watchdog kills a stalled stream fast (retryable 408)", async () => {
  process.env.AI_FIRST_BYTE_TIMEOUT_MS = "150";
  process.env.AI_STALL_TIMEOUT_MS = "100";
  try {
    scenario = (isCloudflare, opts) =>
      // One chunk, then silence forever — never closes.
      sseResponse(opts.signal, [{ at: 5, data: sseChunk("hi") }], { close: false });
    const startedAt = Date.now();
    await assert.rejects(() => callGemma("sys", "user", false, 0.5, 60000));
    // Both providers × 2 attempts, each killed by the ~100ms watchdog plus
    // small backoffs — nowhere near the 60s per-attempt timeout.
    assert.ok(Date.now() - startedAt < 5000, "watchdog should fire in ms, not seconds");
  } finally {
    delete process.env.AI_FIRST_BYTE_TIMEOUT_MS;
    delete process.env.AI_STALL_TIMEOUT_MS;
  }
});

test("caller abort propagates as AbortError", async () => {
  scenario = (isCloudflare, opts) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(okResponse("late")), 2000);
      opts.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        const abortError = new Error("This operation was aborted");
        abortError.name = "AbortError";
        reject(abortError);
      });
    });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 30);
  await assert.rejects(
    () => callGemma("sys", "user", false, 0.5, 5000, controller.signal),
    (error) => error.name === "AbortError"
  );
});

test("extractTextFromResult rejects empty payloads", () => {
  assert.throws(
    () => extractTextFromResult({ choices: [{ message: { content: "" } }] }),
    GemmaApiError
  );
  assert.equal(
    extractTextFromResult({ choices: [{ message: { content: "hi" } }] }),
    "hi"
  );
});

test("parseJSON repairs fenced and truncated model output", () => {
  assert.deepEqual(parseJSON('```json\n{"a": 1}\n```'), { a: 1 });
  assert.deepEqual(parseJSON('{"a": [1, 2'), { a: [1, 2] });
});
