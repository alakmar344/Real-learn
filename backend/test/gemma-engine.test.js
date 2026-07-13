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
