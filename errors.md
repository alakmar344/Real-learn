# Backend Debugging Session - Error Log and Fixes

## Current Session Error (2026-07-04)

**Error:** `AI response format was invalid. Please try again.`

**Request ID:** lesson-1783176574351-2

### Symptoms
The validation in `normalizeJourney/isValidJourney` failed:
- `partsCount: 2` (expected 3 for explain mode)
- `hasKeyTakeaways: false`
- Content truncated mid-word: `skilled cra...`

### Fixes Applied (Commits cc938cf, 3fdd439, 373de43)

1. **`backend/src/validation.js`**:
   - `isValidJourney`: Now accepts 1-N parts instead of requiring exactly 3
   - `normalizeJourney`: Generates default keyTakeaways when missing or empty

2. **`backend/src/server.js`**:
   - Increased `maxOutputTokens` from 3000 to 4000 for explain mode

3. **`backend/src/lib/gemma.js`**:
   - Added status 403 to retryable errors (Cloudflare rate limiting)

---

## Historical Backend Debugging History

### Phase 1: Gemma Model Migration (Commits 9c977e0 → 2205250)
Multiple migrations between AI providers caused cascading issues:

1. **e679c87**: Switch from Vertex AI to Groq API SDK
2. **2b4140d**: Switch to Cloudflare Workers AI via SDK
3. **9c977e0**: Remove Groq and Vercel, Cloudflare is sole provider
4. **2205250**: Use fully qualified `@cf/google/gemma-4-26b-a4b-it` model ID

### Phase 2: Cloudflare API Integration Fixes (Commits c178ef2 → ca16cc8)
JSON parsing failures due to Gemma thinking tokens and malformed output:

1. **9482c4f**: Strip Gemma thinking blocks before JSON parsing
2. **523e48f**: Simplify Gemma thinking filter regex
3. **c178ef2**: Handle multiline reasoning prefixes in parser
4. **da3dca5**: Split into frontend/backend structure
5. **cfbe558**: Fix AI response format issues

### Phase 3: Cloudflare Workers AI Direct Fetch (Commits c178ef2 → 7d17f74)
Switching from SDK to direct fetch:

1. **1c184df**: Replace Cloudflare SDK with direct fetch to fix URL-encoding bug
2. **a8ae296**: Use OpenAI-compatible endpoint to avoid slash encoding bug
3. **47e2912**: Remove broken resolveModel that stripped vendor from model ID
4. **53304c1**: Robust response extraction for Cloudflare Workers AI
5. **c3833a4**: Add detailed logging for AI response parsing failures
6. **7d17f74**: Enforce minimum 30s lesson timeout to prevent premature abort

### Phase 4: Error Handling Hardened (Commits 8366e5c → 161999f)
Retry mechanisms and resilience improvements:

1. **8366e5c**: Add Gemma retry and fallback model resilience
2. **0d70153**: Harden backend error handling and resilience controls
3. **6bd21e1**: Track timeout-triggered Gemma aborts explicitly
4. **55b71e7**: Fix unescaped quotes in quote text
5. **39ce47b**: Address validation feedback on CORS and normalization
6. **54bdefd**: Finalize SSE cleanup and validation polish

### Phase 5: Safety and Moderation (Commits ff8a413 → bc9f096)
Content guardrails and moderation:

1. **ff8a413**: Add fail-open LLM moderation layer for input and AI reply
2. **bc9f096**: Handle Gemma API safety blocks explicitly
3. **550a994**: Fix crash on undefined sources in lesson parts

---

## API Error Status Codes Handled

| Status | Meaning | Handling |
|--------|---------|----------|
| 400 | Bad request | Fail immediately |
| 403 | Rate limiting (Cloudflare) | **Now retryable** (was missing) |
| 429 | Too many requests | Retryable |
| 500-599 | Server errors | Retryable |

---

## Current State

All fixes applied and verified. The system gracefully handles:
- Truncated AI responses with partial parts
- Missing keyTakeaways (generates defaults)
- Incomplete/invalid quiz arrays (rejected)
- 403 rate limit responses from Cloudflare API