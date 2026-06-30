// LLM-based moderation layer that complements the fast regex guard in
// contentGuard.js. It catches harmful content the keyword list misses, while
// being deliberately tuned NOT to block legitimate educational content.
//
// MINDFUL-BY-DESIGN: this layer FAILS OPEN. Any error, timeout, missing API
// key, disabled flag, or unparseable verdict results in `allowed: true`. A
// moderation hiccup must never block a valid lesson. It only blocks when the
// classifier explicitly and confidently says the content is harmful.

import { parseJSON } from "./gemma.js";

const GEMMA_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const MODERATION_MODEL = process.env.MODERATION_MODEL || "gemma-4-26b-a4b-it";
const DEFAULT_MODERATION_TIMEOUT_MS = 8000;
const configuredTimeoutMs = Number(process.env.MODERATION_TIMEOUT_MS);
const MODERATION_TIMEOUT_MS =
  Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_MODERATION_TIMEOUT_MS;
// Keep moderation input bounded so a huge payload can't blow up latency/cost.
const MAX_MODERATION_INPUT_CHARS = 12000;

function isModerationEnabled() {
  const raw = (process.env.MODERATION_ENABLED || "true").trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(raw);
}

const MODERATION_SYSTEM_PROMPT = `You are a careful, fair content-safety classifier for RealLearn, an educational platform for students aged 13 and older.

Decide whether the provided TEXT must be BLOCKED. Block ONLY when the text genuinely contains or requests one of these:
- Sexual content involving minors, or sexually explicit / pornographic material.
- Actionable instructions to make weapons, explosives, or illegal drugs.
- Instructions or encouragement for violence against real people, self-harm, or suicide.
- Hate speech or harassment that attacks people based on a protected characteristic.
- Step-by-step help committing serious crimes (e.g. hacking, fraud, human trafficking).

DO NOT block legitimate educational, historical, scientific, literary, or factual content, even when the subject is sensitive. The following MUST always be ALLOWED:
- History and current affairs, including war, World War 1 and World War 2, the atomic bombings, genocide and the Holocaust, terrorism as a topic of study, and political conflict.
- Science and biology, including the human body, reproduction, diseases, chemistry, and physics (including how nuclear energy/weapons work conceptually).
- Discussion, definitions, causes, consequences, and analysis of difficult topics for learning purposes.

When you are unsure, ALLOW. Only block content that is clearly harmful and not educational in nature.

Respond with ONLY a compact JSON object and nothing else:
{"block": false}
or
{"block": true, "reason": "<short, friendly, user-facing reason>"}`;

/**
 * Classify a piece of text. Returns { allowed: boolean, reason?: string }.
 * Always resolves (never throws) and fails open to { allowed: true }.
 *
 * @param {string} text
 * @param {"input"|"output"} kind
 */
export async function moderateText(text, kind = "input") {
  if (!isModerationEnabled()) return { allowed: true };
  if (!text || typeof text !== "string" || !text.trim()) return { allowed: true };

  const apiKey = process.env.GEMMA_API_KEY;
  if (!apiKey) {
    console.warn("[moderation] GEMMA_API_KEY missing; failing open (allowed)", { kind });
    return { allowed: true };
  }

  const snippet =
    text.length > MAX_MODERATION_INPUT_CHARS
      ? text.slice(0, MAX_MODERATION_INPUT_CHARS)
      : text;
  const label = kind === "output" ? "AI-generated lesson" : "student question";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(
      `${GEMMA_API_ROOT}/${encodeURIComponent(MODERATION_MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: MODERATION_SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [{ text: `Classify this ${label}:\n\n${snippet}` }],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 80 },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      console.warn("[moderation] Non-OK response; failing open", {
        kind,
        status: response.status,
      });
      return { allowed: true };
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const out = Array.isArray(parts)
      ? parts.filter((p) => !p?.thought).map((p) => p?.text ?? "").join("")
      : "";
    const verdict = parseJSON(out);

    if (!verdict || typeof verdict !== "object" || typeof verdict.block !== "boolean") {
      console.warn("[moderation] Unparseable verdict; failing open", {
        kind,
        latencyMs: Date.now() - startedAt,
        preview: out.slice(0, 120),
      });
      return { allowed: true };
    }

    if (verdict.block === true) {
      console.warn("[moderation] Content blocked by classifier", {
        kind,
        latencyMs: Date.now() - startedAt,
        reason: verdict.reason,
      });
      return {
        allowed: false,
        reason:
          typeof verdict.reason === "string" && verdict.reason.trim()
            ? verdict.reason.trim()
            : "This content was flagged by our safety review. Please try a different question.",
      };
    }

    return { allowed: true };
  } catch (error) {
    if (error?.name === "AbortError") {
      console.warn("[moderation] Timed out; failing open", {
        kind,
        timeoutMs: MODERATION_TIMEOUT_MS,
      });
    } else {
      console.warn("[moderation] Error; failing open", {
        kind,
        error: error?.message,
      });
    }
    return { allowed: true };
  } finally {
    clearTimeout(timeoutId);
  }
}
