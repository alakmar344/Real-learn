# Real-Learn Backend: AI Provider Migration & Debugging Log

This document tracks why the backend's AI integration changed shape multiple
times, what broke at each stage, and what fixed it. It exists so that a
future reader — including future you — doesn't mistake a chain of forced
moves for random thrashing.

---

## Why this saga happened at all

The backend originally called Google's Gemini API directly
(`generativelanguage.googleapis.com`) from Render. That stopped working with
a generic, uninformative `403 Forbidden` — Google's edge infrastructure
blocking the request before it ever reached the API's own auth/quota logic,
rather than a normal JSON `PERMISSION_DENIED` error. Confirmed root cause:
**Google blocks requests from some shared datacenter/PaaS IP ranges**
(Render's among them), independent of API key validity. The same request
worked instantly from a residential IP and from Termux on a phone, which
ruled out the code, the key, and the SDK as causes.

That single external constraint is what forced every provider move below.
Each phase either tried to route around the block or dealt with the
consequences of having moved.

---

## Phase 0 — Ruling out the wrong causes

Before the real cause was confirmed, these were checked and eliminated, in
order:

1. **Model name correctness** — confirmed valid against Google's own docs.
2. **API key restrictions / unrestricted-key policy** — Google's June 2026
   policy change (rejecting unrestricted keys) was a plausible match for the
   symptom, but rotating to a properly-restricted key did not fix it.
3. **The SDK itself** — switching from raw `fetch` to Google's official
   `@google/generative-ai` SDK produced the identical 403, ruling out a
   client-library bug.
4. **Confirmed via cross-network test** — identical request succeeded from
   Termux on a mobile network. This isolated the problem to Render's
   outbound IP range specifically, not the app.

---

## Phase 1 — Provider migration attempts (commits `9c977e0` → `2205250`)

With the IP block confirmed, the backend needed a transport path that didn't
route through Google's public Gemini endpoint from Render.

| Commit | Change | Outcome |
|---|---|---|
| `e679c87` | Switched to Vertex AI (Google Cloud, service-account auth) | New auth stack (ADC/JWT) introduced its own failure modes — see Phase 1a below — and ultimately still returned the same generic 403, this time from Vertex's endpoint, likely due to the Model Garden not having explicitly enabled/accepted terms for Gemma 4 on the project |
| — | Evaluated Groq as an alternative | Rejected — confirmed directly against Groq's own model docs that they do not host any Gemma model |
| `2b4140d` | Switched to Cloudflare Workers AI | Cloudflare hosts Google's own Gemma 4 weights directly, on Cloudflare's network — structurally avoids Google's endpoint entirely |
| `9c977e0` | Removed Groq and Vercel AI Gateway code paths | Cloudflare Workers AI kept as sole provider, since Vercel AI Gateway's own routing pool includes Vertex AI as a backing provider — pinning away from it was possible but added complexity for no benefit once Cloudflare alone worked |
| `2205250` | Switched to the fully-qualified model ID `@cf/google/gemma-4-26b-a4b-it` | Required exact vendor-prefixed ID; unqualified IDs failed to resolve |

### Phase 1a — Vertex AI auth detour (not in the commit log, but part of the story)
Before abandoning Vertex AI, two credential issues had to be worked through
and are worth remembering for any future service-account work:
- `invalid_grant: Invalid JWT Signature` — caused by pasting the service
  account JSON somewhere that corrupted the `private_key` field's literal
  `\n` escapes (common with UI textareas that reformat text).
- A stale `GOOGLE_APPLICATION_CREDENTIALS` path pointing at an old, rotated
  key file after generating a replacement — the env var and the actual
  uploaded filename must match exactly.
- **Any service account JSON that was pasted into a chat or shared insecurely
  during this process should be treated as compromised and rotated in IAM,
  not reused.**

---

## Phase 2 — Cloudflare response parsing fixes (commits `c178ef2` → `ca16cc8`)

Once Cloudflare was serving Gemma 4 successfully, a new problem appeared:
the model's raw output wasn't reliably parseable as JSON.

| Commit | Fix |
|---|---|
| `9482c4f` | Strip Gemma's "thinking" blocks before attempting JSON parsing — Gemma 4 has a built-in reasoning mode that can prepend chain-of-thought text before the actual JSON payload |
| `523e48f` | Simplified the thinking-block filter regex — the first version was too narrow and missed variant formats |
| `c178ef2` | Handled multiline reasoning prefixes specifically |
| `da3dca5` | Restructured the codebase into frontend/backend directories (organizational, not a bug fix) |
| `cfbe558` | General fixes to "AI response format was invalid" failures surfaced during this phase |

---

## Phase 3 — Transport-layer fixes: SDK to direct fetch (commits `c178ef2` → `7d17f74`)

The Cloudflare SDK itself introduced a URL-encoding bug specific to model IDs
containing slashes (`@cf/google/gemma-4-26b-a4b-it`).

| Commit | Fix |
|---|---|
| `1c184df` | Replaced the Cloudflare SDK with a direct `fetch` call, resolving the slash-encoding bug at its root |
| `a8ae296` | Used Cloudflare's OpenAI-compatible `/v1/chat/completions` endpoint as a second layer of avoidance for the same slash-encoding issue |
| `47e2912` | Removed a `resolveModel` helper that was incorrectly stripping the `@cf/google/` vendor prefix, causing model-not-found errors |
| `53304c1` | Made response-body extraction more defensive across the slightly different shapes Cloudflare's native and OpenAI-compatible endpoints return |
| `c3833a4` | Added detailed logging specifically for parse failures, to stop future debugging from relying on guesswork |
| `7d17f74` | Enforced a 30-second minimum on the lesson generation timeout, after discovering an unrelated 8-second timeout (from the output-moderation call, which fails open by design) was being misread as the cause of a premature abort |

---

## Phase 4 — Resilience and error handling (commits `8366e5c` → `161999f`)

| Commit | Fix |
|---|---|
| `8366e5c` | Added retry logic and fallback-model support for Gemma call failures |
| `0d70153` | General hardening of backend error handling and resilience controls |
| `6bd21e1` | Explicitly tracked which aborts were timeout-triggered, vs. caller- or client-triggered, to stop conflating unrelated abort sources in logs |
| `55b71e7` | Fixed unescaped quotes inside quoted text breaking JSON structure |
| `39ce47b` | Addressed CORS and normalization edge cases |
| `54bdefd` | Finalized SSE stream cleanup and validation logic |

---

## Phase 5 — Safety and moderation (commits `ff8a413` → `bc9f096`)

| Commit | Fix |
|---|---|
| `ff8a413` | Added a fail-open LLM moderation layer for both user input and AI-generated replies — "fail open" means a moderation timeout lets the response through rather than blocking the user, which is why its own internal 8s timeout should never be confused with the main lesson-generation timeout (see Phase 3) |
| `bc9f096` | Explicitly handled Gemma's safety-block responses instead of treating them as generic parse failures |
| `550a994` | Fixed a crash caused by `undefined` sources in some lesson parts |

---

## Current session (2026-07-04): partial-response validation was too strict

**Error:** `AI response format was invalid. Please try again.`
**Request ID:** `lesson-1783176574351-2`

### What the logs actually showed
- `partsCount: 2` — the model returned 2 lesson parts; validation required
  exactly 3 for "explain" mode.
- `hasKeyTakeaways: false` — the key-takeaways field was missing entirely.
- Content cut off mid-word (`"skilled cra..."`) — the response was
  genuinely truncated before the model finished generating.

Put together: the model ran out of output-token budget before completing
all 3 parts. Rather than failing entirely, the JSON-repair logic correctly
closed the truncated structure, but it was left with only 2 complete parts
and no takeaways section — and the validator, which required an exact match
to the full expected shape, rejected it outright even though most of the
content was usable.

### Fixes applied

**`backend/src/lib/gemma.js`**
- Added HTTP `403` to the set of retryable status codes. Cloudflare Workers
  AI returns `403` for rate limiting, not just for permission errors — the
  retry logic previously treated it as a hard failure.

**`backend/src/server.js`**
- Raised `maxOutputTokens` for "explain" mode from `3000` to **`4000`**,
  giving the model more room to finish all 3 parts and their quizzes before
  hitting the cap.

**`backend/src/validation.js`**
- `isValidJourney` now accepts any number of parts from 1 up to the mode's
  maximum, instead of requiring an exact count. A partial-but-coherent
  lesson is now treated as valid rather than discarded.
- `normalizeJourney` now generates a reasonable default `keyTakeaways`
  section when the model's response omits it, instead of failing validation
  on that field alone.

---

## Current state

As of this session, the backend:
- Calls Gemma 4 26B A4B exclusively via Cloudflare Workers AI, using direct
  `fetch` against the OpenAI-compatible endpoint (no SDK).
- Strips Gemma's thinking-mode output before parsing.
- Retries on `403` (Cloudflare rate limiting), `429`, and `5xx` responses;
  fails immediately on `400`.
- Accepts partial lesson responses (1–N parts) rather than requiring an
  exact part count, and backfills missing key takeaways.
- Applies fail-open input/output moderation with its own independent
  timeout, isolated in logging from the main lesson-generation timeout.

### Known open question
Whether the *quality* difference some testing has shown between this
Cloudflare-hosted Gemma 4 and the earlier Vertex AI attempts is due to
different default inference settings (e.g. thinking mode on/off) or
different serving quantization — this is plausible based on Google's own
documentation of quantization trade-offs, but hasn't been confirmed with a
direct side-by-side test. Worth revisiting if output quality becomes a
concern again.

---

## Quick-reference: status codes and current handling

| Status | Meaning here | Handling |
|---|---|---|
| 400 | Bad request | Fail immediately, no retry |
| 403 | Cloudflare rate limiting | Retryable (fixed this session — was previously treated as fatal) |
| 429 | Too many requests | Retryable |
| 500–599 | Server-side errors | Retryable |

## Quick-reference: lessons for next time

- A generic, contentless `403` with an HTML body (not JSON) from a Google
  endpoint is a strong signal of an edge/IP-level block, not an auth
  problem — check from a different network before spending time on keys.
- When switching model providers, re-check token budgets and prompt
  verbosity assumptions — different models are not equally concise for the
  same prompt.
- Keep timeout sources distinguishable in logs. A moderation timeout and a
  main-generation timeout logging similar-looking messages cost real
  debugging time in this project.
- Validate for "good enough to use" rather than "exactly matches spec"
  where partial content is still usable — it turns truncation into a
  degraded-but-working response instead of a hard failure.
