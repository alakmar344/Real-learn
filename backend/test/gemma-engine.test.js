import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.CEREBRAS_API_KEY = "test-cerebras-key";
process.env.CLOUDFLARE_API_TOKEN = "test-token";
process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
process.env.GEMMA_FALLBACK_MODELS = "gemma-4-27b";
process.env.CLOUDFLARE_AI_MODEL = "@cf/google/gemma-4-26b-a4b-it";
process.env.CLOUDFLARE_AI_MODELS = "@cf/google/gemma-4-9b-it-qa";
process.env.AI_HEDGE_DELAY_MS = "300";
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
  GEMMA_MODEL,
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
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}

`;

function isCerebrasUrl(url) {
  return String(url).includes("api.cerebras.ai");
}

function isCloudflareUrl(url) {
  return String(url).includes("cloudflare.com");
}

beforeEach(() => {
  resetProviderHealth();
  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    if (urlStr.includes("/tcp_warming")) {
      return new Response(null, { status: 204 });
    }
    return scenario(isCerebrasUrl(urlStr), isCloudflareUrl(urlStr), opts, urlStr);
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("GEMMA_MODEL defaults to gemma-4-31b", () => {
  assert.equal(GEMMA_MODEL, "gemma-4-31b");
});

test("healthy primary wins without touching the fallback", async () => {
  let cloudflareCalls = 0;
  scenario = async (isCerebras) => {
    if (isCerebras) return sseResponse(null, [{ at: 0, data: sseChunk("primary-answer") }]);
    cloudflareCalls += 1;
    return okResponse("fallback-answer");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "primary-answer");
  assert.equal(cloudflareCalls, 0);
});

test("slow primary is hedged: cloudflare launches in parallel and wins", async () => {
  scenario = (isCerebras, isCloudflare, opts) =>
    new Promise((resolve, reject) => {
      if (isCerebras) {
        const timer = setTimeout(
          () => resolve(sseResponse(opts.signal, [{ at: 0, data: sseChunk("slow") }])),
          3000
        );
        opts.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          const abortError = new Error("aborted");
          abortError.name = "AbortError";
          reject(abortError);
        });
      } else {
        setTimeout(() => resolve(okResponse("fast-cloudflare")), 20);
      }
    });
  const startedAt = Date.now();
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "fast-cloudflare");
  // hedge delay (300ms) + cloudflare latency (20ms) + slack — never the 3s primary
  assert.ok(Date.now() - startedAt < 1000);
});

test("failing primary triggers immediate fail-fast cloudflare (no hedge wait)", async () => {
  scenario = async (isCerebras, isCloudflare) => {
    if (isCerebras) return jsonResponse({ errors: [{ message: "boom" }] }, 500);
    return okResponse("cloudflare-answer");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "cloudflare-answer");
});

test("cloudflare rotates to the next model on 429", async () => {
  const seenModels = [];
  scenario = async (isCerebras, isCloudflare, opts) => {
    if (isCerebras) return jsonResponse({ errors: [{ message: "down" }] }, 500);
    const body = JSON.parse(opts.body);
    seenModels.push(body.model);
    if (body.model === "@cf/google/gemma-4-26b-a4b-it") {
      return jsonResponse({ error: { message: "rate limited" } }, 429);
    }
    return okResponse("rotated-answer");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "rotated-answer");
  assert.deepEqual(seenModels, [
    "@cf/google/gemma-4-26b-a4b-it",
    "@cf/google/gemma-4-9b-it-qa",
  ]);
  // The working model is remembered for the next request.
  assert.equal(getProviderHealthSnapshot().cloudflare.preferredModelIndex, 1);
});

test("total outage opens both circuits and surfaces a retryable error", async () => {
  scenario = async () => jsonResponse({ errors: [{ message: "dead" }] }, 500);
  await assert.rejects(() => callGemma("sys", "user", false, 0.5, 5000));
  const snapshot = getProviderHealthSnapshot();
  assert.equal(snapshot.cerebras.circuitOpen, true);
  assert.equal(snapshot.cloudflare.circuitOpen, true);
});

test("open circuits still half-open-probe instead of refusing outright", async () => {
  scenario = async () => jsonResponse({ errors: [{ message: "dead" }] }, 500);
  await assert.rejects(() => callGemma("sys", "user", false, 0.5, 5000));

  // Provider recovers — the next call must probe it, not throw CircuitOpen.
  let probed = 0;
  scenario = async () => {
    probed += 1;
    return sseResponse(null, [{ at: 0, data: sseChunk("recovered") }]);
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "recovered");
  assert.equal(probed, 1);
});

test("hedge is SKIPPED while the leader is streaming (no cloudflare spend)", async () => {
  let cloudflareCalls = 0;
  scenario = (isCerebras, isCloudflare, opts) => {
    if (isCerebras) {
      // First chunk at 20ms (before the 300ms hedge), finishes at 250ms
      // (after the hedge would have fired).
      return sseResponse(opts.signal, [
        { at: 20, data: sseChunk("slow ") },
        { at: 250, data: sseChunk("but alive") },
      ]);
    }
    cloudflareCalls += 1;
    return okResponse("should-never-run");
  };
  const text = await callGemma("sys", "user", false, 0.5, 5000);
  assert.equal(text, "slow but alive");
  assert.equal(cloudflareCalls, 0);
});

test("silence watchdog kills a stalled stream fast (retryable 408)", async () => {
  process.env.AI_FIRST_BYTE_TIMEOUT_MS = "150";
  process.env.AI_STALL_TIMEOUT_MS = "100";
  try {
    scenario = (isCerebras, isCloudflare, opts) =>
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

test("no-thinking knob is passed to cloudflare", async () => {
  process.env.AI_DISABLE_THINKING = "cloudflare";
  try {
    const payloads = { cerebras: null, cloudflare: null };
    scenario = async (isCerebras, isCloudflare, opts) => {
      const body = JSON.parse(opts.body);
      if (isCerebras) {
        payloads.cerebras = body;
        // Fail Cerebras so the cloudflare fallback also runs and we can inspect its payload.
        return jsonResponse({ errors: [{ message: "down" }] }, 500);
      }
      payloads.cloudflare = body;
      return okResponse("fast-answer");
    };
    const text = await callGemma("sys", "user", false, 0.5, 5000);
    assert.equal(text, "fast-answer");
    assert.equal(payloads.cerebras.chat_template_kwargs, undefined);
    assert.deepEqual(payloads.cloudflare.chat_template_kwargs, {
      enable_thinking: false,
    });
  } finally {
    delete process.env.AI_DISABLE_THINKING;
  }
});

test("caller abort propagates as AbortError", async () => {
  scenario = (isCerebras, isCloudflare, opts) =>
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
