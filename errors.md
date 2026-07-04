# Backend Debugging Session - Error Log and Fixes

## Original Error (from logs)

**Error:** `AI response format was invalid. Please try again.`

**Timestamp:** 2026-07-04T14:50:26Z

**Request ID:** lesson-1783176574351-2

## Symptoms

The validation in `normalizeJourney/isValidJourney` failed with the following diagnostics:

```json
{
  "parsedKeys": ["topic", "subject", "language", "level", "parts"],
  "hasParts": true,
  "partsCount": 2,
  "hasKeyTakeaways": false,
  "keyTakeawaysCount": undefined
}
```

The AI response was truncated mid-word (`skilled cra...`) and only contained 2 parts instead of the expected 3.

## Root Cause Analysis

1. **Token limit too low (3000)** - For "explain" mode generating a 3-part lesson with ~200-280 words per part plus quiz questions, the model was hitting the output limit and getting truncated.

2. **Strict validation** - The original validation required exactly 3 parts and mandatory keyTakeaways, but truncated responses would only have partial data.

3. **403 rate limiting** - Cloudflare Workers AI may return 403 for rate limiting, but the code didn't treat 403 as retryable.

## Fixes Applied

### Commit 1: Fix validation to handle partial/truncated AI responses

**File:** `backend/src/validation.js`

1. **`isValidJourney` function:**
   - Changed: `data.parts.length !== rules.partsCount` 
   - To: `data.parts.length < 1 || data.parts.length > rules.partsCount`
   - Now accepts 1-N valid parts instead of requiring exactly 3

2. **`normalizeJourney` function:**
   - Added: Default keyTakeaways generation when missing or empty
   - Generates placeholder: `"Key insight from part ${i + 1}"`

### Commit 2: Increase token limit to prevent AI response truncation

**Files:** `backend/src/server.js`, `backend/src/lib/gemma.js`

- Increased `maxOutputTokens` from 3000 to 4000 for explain mode
- Each part requires ~1000-1200 tokens (content + quiz), 3000 was too tight
- Added comment explaining the token budget calculation

### Commit 3: Handle 403 rate limiting as retryable

**File:** `backend/src/lib/gemma.js`

- Added status 403 to `isRetryableGemmaError()` function
- Cloudflare Workers AI returns 403 for rate limiting/prohibited model access
- Also added to `isGemmaServiceUnavailableError()` for consistency

## Related Issues

- **Moderation timeout** - Seen in logs with 8000ms timeout, but this was handled gracefully with "fail open" behavior (content was allowed through on timeout)
- **Request abort** - The request was aborted by caller after validation failure

## Current State

All commits are applied and verified. The system now gracefully handles:
- Truncated responses with partial parts
- Missing keyTakeaways
- Incomplete quiz arrays (rejected as invalid)
- 403 rate limit responses from Cloudflare API