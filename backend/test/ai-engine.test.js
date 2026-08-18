import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.GROQ_API_KEY = "test-groq-key";
process.env.NVIDIA_API_KEY = "test-nvidia-key";
process.env.CLOUDFLARE_API_TOKEN = "test-token";
process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
process.env.GROQ_AI_MODEL = "openai/gpt-oss-120b";
process.env.GROQ_SECONDARY_MODEL = "openai/gpt-oss-20b";
process.env.GROQ_TERTIARY_MODEL = "qwen/qwen3.6-27b";
process.env.MISTRAL_API_KEY = "test-mistral-key";
process.env.MISTRAL_AI_MODEL = "mistral-small-latest";
process.env.MISTRAL_AI_MODELS = "mistral-large-latest";
process.env.NVIDIA_AI_MODEL = "meta/llama-3.3-70b-instruct";
process.env.NVIDIA_AI_MODELS = "mistralai/mistral-large-2-instruct";
process.env.CLOUDFLARE_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
process.env.CLOUDFLARE_AI_MODELS = "@cf/meta/llama-3.1-70b-instruct";
process.env.AI_HEDGE_DELAY_MS = "300";
process.env.AI_MAX_RETRIES = "1";
process.env.AI_RETRY_DELAY_MS = "20";
process.env.AI_MAX_RETRY_DELAY_MS = "50";

const {
  callAI,
  parseJSON,
  extractTextFromResult,
  getProviderHealthSnapshot,
  resetProviderHealth,
  AIApiError,
  PRIMARY_AI_MODEL,
  getGroqModels,
  getMistralModels,
  isMistralConfigured,
  selectGroqModel,
  recordGroqTokens,
  getRollingGroqTpmUsage,
  isGroqTpmNearLimit,
  resetGroqTokenLedger,
  resetBannedModels,
} = await import("../src/lib/aiEngine.js");

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

function isMistralUrl(url) {
  return String(url).includes("api.mistral.ai");
}

function isNvidiaUrl(url) {
  return String(url).includes("integrate.api.nvidia.com");
}

function isCloudflareUrl(url) {
  return String(url).includes("cloudflare.com");
}

beforeEach(() => {
  resetProviderHealth();
  resetGroqTokenLedger();
  resetBannedModels();
  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    return scenario(
      isGroqUrl(urlStr),
      isMistralUrl(urlStr),
      isNvidiaUrl(urlStr),
      isCloudflareUrl(urlStr),
      opts,
      urlStr
    );
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("PRIMARY_AI_MODEL follows GROQ_AI_MODEL", () => {
  assert.equal(PRIMARY_AI_MODEL, "openai/gpt-oss-120b");
});

test("healthy primary (Groq) wins without touching the fallback", async () => {
  let fallbackCalls = 0;
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    if (isGroq) return sseResponse(opts?.signal, [{ at: 0, data: sseChunk("primary-answer") }]);
    fallbackCalls += 1;
    return okResponse("fallback-answer");
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "primary-answer");
  assert.equal(fallbackCalls, 0);
});

test("Groq requests use the OpenAI-compatible endpoint with streaming and no unsupported params", async () => {
  let groqPayload = null;
  let groqUrl = null;
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts, urlStr) => {
    if (isGroq) {
      groqPayload = JSON.parse(opts.body);
      groqUrl = urlStr;
      return sseResponse(opts?.signal, [{ at: 0, data: sseChunk("groq-answer") }]);
    }
    return okResponse("fallback");
  };
  const text = await callAI("sys", "user", 0.5, 5000, null, 1234);
  assert.equal(text, "groq-answer");
  assert.equal(groqUrl, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(groqPayload.stream, true);
  assert.equal(groqPayload.max_completion_tokens, 1234);
  // Groq rejects these with a 400 — they must never be sent.
  assert.equal(groqPayload.chat_template_kwargs, undefined);
  assert.equal(groqPayload.response_format, undefined);
});

test("Mistral requests enable JSON mode (streaming-compatible structured output)", async () => {
  let mistralPayload = null;
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    if (isGroq) return jsonResponse({ errors: [{ message: "down" }] }, 500);
    if (isMistral) {
      mistralPayload = JSON.parse(opts.body);
      return okResponse('{"ok":true}');
    }
    return okResponse("other");
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, '{"ok":true}');
  assert.deepEqual(mistralPayload.response_format, { type: "json_object" });
  assert.equal(mistralPayload.stream, true);
});

test("MISTRAL_JSON_MODE=off disables the response_format field", async () => {
  process.env.MISTRAL_JSON_MODE = "off";
  try {
    let mistralPayload = null;
    scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
      if (isGroq) return jsonResponse({ errors: [{ message: "down" }] }, 500);
      if (isMistral) {
        mistralPayload = JSON.parse(opts.body);
        return okResponse("plain");
      }
      return okResponse("other");
    };
    await callAI("sys", "user", 0.5, 5000);
    assert.equal(mistralPayload.response_format, undefined);
  } finally {
    delete process.env.MISTRAL_JSON_MODE;
  }
});

test("slow primary is hedged: mistral launches in parallel and wins", async () => {
  scenario = (isGroq, isMistral, isNvidia, isCloudflare, opts) =>
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
        setTimeout(() => resolve(okResponse("fast-mistral")), 20);
      }
    });
  const startedAt = Date.now();
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "fast-mistral");
  // hedge delay (300ms) + mistral latency (20ms) + slack — never the 3s primary
  assert.ok(Date.now() - startedAt < 1000);
});

test("failing primary triggers immediate fail-fast fallback (no hedge wait)", async () => {
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare) => {
    if (isGroq) return jsonResponse({ errors: [{ message: "boom" }] }, 500);
    if (isMistral) return okResponse("mistral-answer");
    if (isNvidia) return okResponse("nvidia-answer");
    return okResponse("cloudflare-answer");
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "mistral-answer");
});

test("mistral rotates to the next model on 429", async () => {
  const seenModels = [];
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    if (isGroq) return jsonResponse({ errors: [{ message: "down" }] }, 500);
    if (isMistral) {
      const body = JSON.parse(opts.body);
      seenModels.push(body.model);
      if (body.model === "mistral-small-latest") {
        return jsonResponse({ error: { message: "rate limited" } }, 429);
      }
      return okResponse("mistral-rotated-answer");
    }
    return okResponse("nvidia-answer");
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "mistral-rotated-answer");
  assert.deepEqual(seenModels, [
    "mistral-small-latest",
    "mistral-large-latest",
  ]);
  assert.equal(getProviderHealthSnapshot().mistral.preferredModelIndex, 1);
});

test("nvidia rotates to the next model on 429", async () => {
  const seenModels = [];
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    if (isGroq || isMistral) return jsonResponse({ errors: [{ message: "down" }] }, 500);
    if (isCloudflare) return okResponse("cloudflare-last-resort");
    const body = JSON.parse(opts.body);
    seenModels.push(body.model);
    if (body.model === "meta/llama-3.3-70b-instruct") {
      return jsonResponse({ error: { message: "rate limited" } }, 429);
    }
    return okResponse("rotated-answer");
  };
  const text = await callAI("sys", "user", 0.5, 5000);
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
  await assert.rejects(() => callAI("sys", "user", 0.5, 5000));
  const snapshot = getProviderHealthSnapshot();
  assert.equal(snapshot.groq.circuitOpen, true);
  assert.equal(snapshot.mistral.circuitOpen, true);
  assert.equal(snapshot.nvidia.circuitOpen, true);
  assert.equal(snapshot.cloudflare.circuitOpen, true);
});

test("open circuits still half-open-probe instead of refusing outright", async () => {
  scenario = async () => jsonResponse({ errors: [{ message: "dead" }] }, 500);
  await assert.rejects(() => callAI("sys", "user", 0.5, 5000));

  // Provider recovers — the next call must probe it, not throw CircuitOpen.
  let probed = 0;
  scenario = async () => {
    probed += 1;
    return sseResponse(null, [{ at: 0, data: sseChunk("recovered") }]);
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "recovered");
  assert.equal(probed, 1);
});

test("hedge is SKIPPED while the leader is streaming (no fallback spend)", async () => {
  let fallbackCalls = 0;
  scenario = (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
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
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "slow but alive");
  assert.equal(fallbackCalls, 0);
});

test("silence watchdog kills a stalled stream fast (retryable 408)", async () => {
  process.env.AI_FIRST_BYTE_TIMEOUT_MS = "150";
  process.env.AI_STALL_TIMEOUT_MS = "100";
  try {
    scenario = (isGroq, isMistral, isNvidia, isCloudflare, opts) =>
      // One chunk, then silence forever — never closes.
      sseResponse(opts.signal, [{ at: 5, data: sseChunk("hi") }], { close: false });
    const startedAt = Date.now();
    await assert.rejects(() => callAI("sys", "user", 0.5, 60000));
    // Providers killed by watchdog plus small backoffs
    assert.ok(Date.now() - startedAt < 5000, "watchdog should fire in ms, not seconds");
  } finally {
    delete process.env.AI_FIRST_BYTE_TIMEOUT_MS;
    delete process.env.AI_STALL_TIMEOUT_MS;
  }
});

test("chat_template_kwargs is never sent to Groq and omitted on standard NVIDIA calls", async () => {
  const payloads = { groq: null, nvidia: null };
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    const body = JSON.parse(opts.body);
    if (isGroq) {
      payloads.groq = body;
      // Fail Groq and Mistral so the NVIDIA fallback runs and we can inspect its payload.
      return jsonResponse({ errors: [{ message: "down" }] }, 500);
    }
    if (isMistral) {
      return jsonResponse({ errors: [{ message: "down" }] }, 500);
    }
    if (!isNvidia) return okResponse("cloudflare-answer");
    payloads.nvidia = body;
    return okResponse("fast-answer");
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "fast-answer");
  // Groq Cloud rejects chat_template_kwargs with 400 error — must be undefined
  assert.equal(payloads.groq.chat_template_kwargs, undefined);
  // NVIDIA NIM standard calls use standard OpenAI payload
  assert.equal(payloads.nvidia.chat_template_kwargs, undefined);
});

test("nvidia rotates to the next model on 403 forbidden (not allowed on free tier)", async () => {
  const seenModels = [];
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    if (isGroq || isMistral) return jsonResponse({ errors: [{ message: "down" }] }, 500);
    if (isCloudflare) return okResponse("cloudflare-last-resort");
    const body = JSON.parse(opts.body);
    seenModels.push(body.model);
    if (body.model === "meta/llama-3.3-70b-instruct") {
      return jsonResponse({ error: { message: "model not allowed on current tier", type: "forbidden" } }, 403);
    }
    return okResponse("rotated-free-tier-answer");
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "rotated-free-tier-answer");
  assert.deepEqual(seenModels, [
    "meta/llama-3.3-70b-instruct",
    "mistralai/mistral-large-2-instruct",
  ]);
  assert.equal(getProviderHealthSnapshot().nvidia.preferredModelIndex, 1);
});

test("caller abort propagates as AbortError", async () => {
  scenario = (isGroq, isMistral, isNvidia, isCloudflare, opts) =>
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
    () => callAI("sys", "user", 0.5, 5000, controller.signal),
    (error) => error.name === "AbortError"
  );
});

test("extractTextFromResult rejects empty payloads", () => {
  assert.throws(
    () => extractTextFromResult({ choices: [{ message: { content: "" } }] }),
    AIApiError
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

test("Groq and Mistral model lists include configured models", () => {
  const groqModels = getGroqModels();
  assert.ok(groqModels.includes("openai/gpt-oss-120b"));
  assert.ok(groqModels.includes("openai/gpt-oss-20b"));
  assert.ok(groqModels.includes("qwen/qwen3.6-27b"));

  assert.equal(isMistralConfigured(), true);
  const mistralModels = getMistralModels();
  assert.ok(mistralModels.includes("mistral-small-latest"));
  assert.ok(mistralModels.includes("mistral-large-latest"));
});

test("Groq model selection sticks with the preferred model while it has TPM headroom", () => {
  resetGroqTokenLedger();
  const models = getGroqModels();
  const first = selectGroqModel(models, 0, 500);
  assert.equal(first.model, models[0]);
  assert.equal(first.reason, "preferred");
  // Affinity: repeated selection keeps the same warm model — no blind rotation.
  const second = selectGroqModel(models, 0, 500);
  assert.equal(second.model, models[0]);
});

test("Groq model selection rotates when the preferred model nears its TPM limit", () => {
  resetGroqTokenLedger();
  const models = getGroqModels();
  recordGroqTokens(models[0], 6500);
  const selection = selectGroqModel(models, 0, 500);
  assert.notEqual(selection.model, models[0]);
  assert.equal(selection.reason, "tpm_rotation");
  // Other models' ledgers are independent (per-model TPM envelopes).
  assert.equal(getRollingGroqTpmUsage(selection.model), 0);
});

test("Groq per-model sliding 60s TPM tracker tracks usage and limits", () => {
  resetGroqTokenLedger();
  assert.equal(getRollingGroqTpmUsage("m-a"), 0);
  assert.equal(isGroqTpmNearLimit("m-a", 500), false);

  // Record token usage approaching the 8k TPM limit (safety threshold = 6800)
  recordGroqTokens("m-a", 6500);
  assert.equal(getRollingGroqTpmUsage("m-a"), 6500);
  assert.equal(isGroqTpmNearLimit("m-a", 500), true);
  // A different model has its own independent envelope.
  assert.equal(isGroqTpmNearLimit("m-b", 500), false);

  resetGroqTokenLedger();
  assert.equal(getRollingGroqTpmUsage("m-a"), 0);
  assert.equal(isGroqTpmNearLimit("m-a", 500), false);
});

test("a Groq 429 marks that model's TPM ledger full so selection steers away", async () => {
  const models = getGroqModels();
  const seenGroqModels = [];
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    if (isGroq) {
      const body = JSON.parse(opts.body);
      seenGroqModels.push(body.model);
      if (body.model === models[0]) {
        return jsonResponse({ error: { message: "rate_limit_exceeded" } }, 429);
      }
      return sseResponse(opts.signal, [{ at: 0, data: sseChunk("rotated-groq") }]);
    }
    return new Promise(() => {}); // other providers never answer
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "rotated-groq");
  assert.deepEqual(seenGroqModels, [models[0], models[1]]);
  // Ledger poisoned for the throttled model → next selection avoids it.
  assert.equal(isGroqTpmNearLimit(models[0], 100), true);
  const next = selectGroqModel(models, 0, 500);
  assert.notEqual(next.model, models[0]);
});

test("a Groq 404 bans that model so later requests skip it entirely", async () => {
  const models = getGroqModels();
  const seenGroqModels = [];
  const failingModel = models[2];
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    if (isGroq) {
      const body = JSON.parse(opts.body);
      seenGroqModels.push(body.model);
      if (body.model === failingModel) {
        return jsonResponse(
          { error: { message: `The model \`${failingModel}\` does not exist` } },
          404
        );
      }
      return sseResponse(opts.signal, [{ at: 0, data: sseChunk("groq-ok") }]);
    }
    return new Promise(() => {}); // other providers never answer
  };

  // Force selection to start at the tertiary model by poisoning the primary.
  recordGroqTokens(models[0], 8000);
  recordGroqTokens(models[1], 8000);
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "groq-ok");

  // After the 404, the tertiary model is banned. A subsequent call should
  // skip it even if the preferred index points there.
  seenGroqModels.length = 0;
  const text2 = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text2, "groq-ok");
  assert.ok(
    !seenGroqModels.includes(failingModel),
    "banned model was tried again"
  );
});

test("exact usage from the Groq stream feeds the per-model TPM ledger", async () => {
  const models = getGroqModels();
  const usageChunk = `data: ${JSON.stringify({
    choices: [{ delta: { content: "!" } }],
    x_groq: { usage: { total_tokens: 1234 } },
  })}

`;
  scenario = async (isGroq, isMistral, isNvidia, isCloudflare, opts) => {
    if (isGroq) {
      return sseResponse(opts.signal, [
        { at: 0, data: sseChunk("answer") },
        { at: 5, data: usageChunk },
      ]);
    }
    return new Promise(() => {});
  };
  const text = await callAI("sys", "user", 0.5, 5000);
  assert.equal(text, "answer!");
  assert.equal(getRollingGroqTpmUsage(models[0]), 1234);
});
