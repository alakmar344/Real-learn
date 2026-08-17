import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.GROQ_API_KEY = "test-groq-key";
process.env.NVIDIA_API_KEY = "test-nvidia-key";
process.env.CLOUDFLARE_API_TOKEN = "test-token";
process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
process.env.GROQ_AI_MODEL = "qwen/qwen3.6-27b";
process.env.GROQ_FALLBACK_MODELS = "gpt-oss-120b";
process.env.NVIDIA_AI_MODEL = "meta/llama-3.3-70b-instruct";
process.env.NVIDIA_AI_MODELS = "mistralai/mistral-large-2-instruct";
process.env.CLOUDFLARE_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
process.env.CLOUDFLARE_AI_MODELS = "@cf/meta/llama-3.1-70b-instruct";
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
  PRIMARY_AI_MODEL,
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

function isGroqUrl(url) {
  return String(url).includes("api.groq.com");
}

function isNvidiaUrl(url) {
  return String(url).includes("integrate.api.nvidia.com");
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
    return scenario(isGroqUrl(urlStr), isNvidiaUrl(urlStr), isCloudflareUrl(urlStr), opts, urlStr);
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("PRIMARY_AI_MODEL and GEMMA_MODEL default to qwen/qwen3.6-27b", () => {
  assert.equal(PRIMARY_AI_MODEL, "qwen/qwen3.6-27b");
  assert.equal(GEMMA_MODEL, "qwen/qwen3.6-27b");
});

test("healthy primary (Groq) wins without touching the fallback", async () => {
  let fallbackCalls = 0;
  scenario = async (isGroq, isNvidia, isCloudflare, opts) => {
    if (isGroq) return sseResponse(opts?.signal, [{ at: 0, data: sseChunk("primary-answer") }]);
    fallbackCalls += 1;
    return okResponse("fallback-answer");
  };
  const text = await callGemma("sys", "user", 0.5, 5000);
  assert.equal(text, "primary-answer");
  assert.equal(fallbackCalls, 0);
});

test("slow primary is hedged: nvidia launches in parallel and wins", async () => {
  scenario = (isGroq, isNvidia, isCloudflare, opts) =>
    new Promise((resolve, reject) => {
      if (isGroq) {
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
        setTimeout(() => resolve(okResponse("fast-nvidia")), 20);
      }
    });
  const startedAt = Date.now();
  const text = await callGemma("sys", "user", 0.5, 5000);
  assert.equal(text, "fast-nvidia");
  // hedge delay (300ms) + nvidia latency (20ms) + slack — never the 3s primary
  assert.ok(Date.now() - startedAt < 1000);
});

test("failing primary triggers immediate fail-fast nvidia (no hedge wait)", async () => {
  scenario = async (isGroq, isNvidia, isCloudflare) => {
    if (isGroq) return jsonResponse({ errors: [{ message: "boom" }] }, 500);
    if (isNvidia) return okResponse("nvidia-answer");
    return okResponse("cloudflare-answer");
  };
  const text = await callGemma("sys", "user", 0.5, 5000);
  assert.equal(text, "nvidia-answer");
});

test("nvidia rotates to the next model on 429", async () => {
  const seenModels = [];
  scenario = async (isGroq, isNvidia, isCloudflare, opts) => {
    if (isGroq) return jsonResponse({ errors: [{ message: "down" }] }, 500);
    if (isCloudflare) return okResponse("cloudflare-last-resort");
    const body = JSON.parse(opts.body);
    seenModels.push(body.model);
    if (body.model === "meta/llama-3.3-70b-instruct") {
      return jsonResponse({ error: { message: "rate limited" } }, 429);
    }
    return okResponse("rotated-answer");
  };
  const text = await callGemma("sys", "user", 0.5, 5000);
  assert.equal(text, "rotated-answer");
  assert.deepEqual(seenModels, [
    "meta/llama-3.3-70b-instruct",
    "mistralai/mistral-large-2-instruct",
  ]);
  // The working model is remembered for the next request.
  assert.equal(getProviderHealthSnapshot().nvidia.preferredModelIndex, 1);
});

test("total outage opens all circuits and surfaces a retryable error", async () => {
  scenario = async () => jsonResponse({ errors: [{ message: "dead" }] }, 500);
  await assert.rejects(() => callGemma("sys", "user", 0.5, 5000));
  const snapshot = getProviderHealthSnapshot();
  assert.equal(snapshot.groq.circuitOpen, true);
  assert.equal(snapshot.nvidia.circuitOpen, true);
  assert.equal(snapshot.cloudflare.circuitOpen, true);
});

test("open circuits still half-open-probe instead of refusing outright", async () => {
  scenario = async () => jsonResponse({ errors: [{ message: "dead" }] }, 500);
  await assert.rejects(() => callGemma("sys", "user", 0.5, 5000));

  // Provider recovers — the next call must probe it, not throw CircuitOpen.
  let probed = 0;
  scenario = async () => {
    probed += 1;
    return sseResponse(null, [{ at: 0, data: sseChunk("recovered") }]);
  };
  const text = await callGemma("sys", "user", 0.5, 5000);
  assert.equal(text, "recovered");
  assert.equal(probed, 1);
});

test("hedge is SKIPPED while the leader is streaming (no fallback spend)", async () => {
  let fallbackCalls = 0;
  scenario = (isGroq, isNvidia, isCloudflare, opts) => {
    if (isGroq) {
      // First chunk at 20ms (before the 300ms hedge), finishes at 250ms
      // (after the hedge would have fired).
      return sseResponse(opts.signal, [
        { at: 20, data: sseChunk("slow ") },
        { at: 250, data: sseChunk("but alive") },
      ]);
    }
    fallbackCalls += 1;
    return okResponse("should-never-run");
  };
  const text = await callGemma("sys", "user", 0.5, 5000);
  assert.equal(text, "slow but alive");
  assert.equal(fallbackCalls, 0);
});

test("silence watchdog kills a stalled stream fast (retryable 408)", async () => {
  process.env.AI_FIRST_BYTE_TIMEOUT_MS = "150";
  process.env.AI_STALL_TIMEOUT_MS = "100";
  try {
    scenario = (isGroq, isNvidia, isCloudflare, opts) =>
      // One chunk, then silence forever — never closes.
      sseResponse(opts.signal, [{ at: 5, data: sseChunk("hi") }], { close: false });
    const startedAt = Date.now();
    await assert.rejects(() => callGemma("sys", "user", 0.5, 60000));
    // Both providers × 2 attempts, each killed by the ~100ms watchdog plus
    // small backoffs — nowhere near the 60s per-attempt timeout.
    assert.ok(Date.now() - startedAt < 5000, "watchdog should fire in ms, not seconds");
  } finally {
    delete process.env.AI_FIRST_BYTE_TIMEOUT_MS;
    delete process.env.AI_STALL_TIMEOUT_MS;
  }
});

test("thinking knob is passed to nvidia by default", async () => {
  process.env.AI_DISABLE_THINKING = "off";
  try {
    const payloads = { groq: null, nvidia: null };
    scenario = async (isGroq, isNvidia, isCloudflare, opts) => {
      const body = JSON.parse(opts.body);
      if (isGroq) {
        payloads.groq = body;
        // Fail Groq so the NVIDIA fallback also runs and we can inspect its payload.
        return jsonResponse({ errors: [{ message: "down" }] }, 500);
      }
      if (!isNvidia) return okResponse("cloudflare-answer");
      payloads.nvidia = body;
      return okResponse("fast-answer");
    };
    const text = await callGemma("sys", "user", 0.5, 5000);
    assert.equal(text, "fast-answer");
    assert.equal(payloads.groq.chat_template_kwargs, undefined);
    assert.deepEqual(payloads.nvidia.chat_template_kwargs, {
      enable_thinking: true,
    });
  } finally {
    delete process.env.AI_DISABLE_THINKING;
  }
});

test("caller abort propagates as AbortError", async () => {
  scenario = (isGroq, isNvidia, isCloudflare, opts) =>
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
    () => callGemma("sys", "user", 0.5, 5000, controller.signal),
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
