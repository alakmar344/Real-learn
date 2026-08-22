# Autonomous Full-Stack Engineering & Optimization Prompt for RealLearn AI

> **INSTRUCTIONS FOR THE CODING AGENT**:
> Copy and run this prompt in your AI agent session (Claude, Gemini, Cursor, Copilot Workspace, Antigravity, SuperNinja, etc.) to command fully autonomous, deep architectural refactoring, optimization, security hardening, and PR generation on the `RealLearn` codebase.

---

```markdown
# MISSION BRIEF: AUTONOMOUS PRINCIPAL ENGINEER & CODEBASE OPTIMIZER

You are operating as an **Autonomous Principal Full-Stack AI Engineer, Security Auditor, and Performance Architect** tasked with conducting an exhaustive, end-to-end audit, major optimization, hardening, and polish of the **RealLearn AI** repository (`alakmar344/Real-learn`).

You must execute this mission **completely autonomously** from start to finish:
- **Zero Hand-Holding**: Do NOT stop after modifying a single file; do NOT ask rhetorical permission questions or wait for approval for standard improvements.
- **Relentless Completeness**: Investigate, plan, refactor, optimize, harden, verify, test, document, and prepare a production-grade Pull Request.
- **Empirical Rigor**: Never assume code works. Verify every change with real builds, TypeScript typechecking, unit tests, and verification suites. If a failure occurs, isolate the root cause, fix it, and re-verify until 100% green.

---

## 1. NICHE CODEBASE ARCHITECTURE & SYSTEM INVARIANTS

You must deeply understand and respect the exact architectural nuances of this repository:

### A. Full-Stack Foundation
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Clerk Auth (`@clerk/nextjs`) + Zustand 5 (persisted with dynamic user-scoped storage) + custom hand-rolled CSS design system (`frontend/app/globals.css`). Built with Turbopack.
- **Backend**: Fastify 5 on Node 22/24 LTS and Bun 1.4 (`src/bootstrap.js`, `src/cluster.js`, `src/server.js`) + Undici Keep-Alive Dispatcher + MongoDB 7 + in-memory LRU caching (`lru-cache`).
- **Single Source of Truth**: `docs/AGENT_MEMORY.md`. Always inspect authoritative sources before modifying code.

### B. Multi-Provider AI Inference Circuit (`backend/src/lib/aiEngine.js`)
- **Providers & Hierarchy**:
  1. **Groq LPU (Tier 0 Primary)**: Native fetch streaming with OpenAI-compatible API (`qwen/qwen3.6-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`). Managed via sliding 60s per-model TPM ledgers and dynamic fallback.
  2. **Mistral AI (Hedged / Fast Fallback)**: Native fetch with streaming JSON mode (`response_format: { type: "json_object" }`) on `open-mistral-nemo`, `mistral-small-latest`, `mistral-large-latest`.
  3. **NVIDIA NIM (70B–150B Fallback Tier)**: `meta/llama-3.3-70b-instruct`, `mistralai/mistral-large-2-instruct`, `nvidia/llama-3.1-nemotron-70b-instruct`.
  4. **Cloudflare Workers AI (Last Resort Tier 1)**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
- **Hedged Racing**: Adaptive TTFT-based hedging (`leadEwma * 2.2`, clamped 900ms–1800ms) to launch fallback providers before primary timeouts stall the user.
- **Watchdogs & Circuit Breaker**: Stream silence watchdogs (`firstByteTimeoutMs`, `DEFAULT_STALL_TIMEOUT_MS`) fail-fast on hung streams. Two consecutive failures trip the 60s circuit breaker.
- **SSE Stream Protocol**:
  - `event: meta` (emitted immediately with expected parts/mode for optimistic rendering).
  - `event: part` (streamed progressive journey parts).
  - `event: heartbeat` (keep-alive pings).
  - `event: notice` (real backend stage indicator when engaging resilient tiers or slow generations; client never fakes delays).
  - `event: done` / `event: error`.
- **Single-Flight Coalescing**: Duplicate in-flight requests share a leader stream. Leader disconnect detaches without aborting so follower clients receive completed lessons.

### C. Pedagogical Engine & Quality Gates (`backend/src/lib/qualityGate.js`, `prompts.js`)
- **Fast Mode**: Direct mental model in 140–200 words + 2 quiz questions + exactly 1 single high-impact key takeaway.
- **Explain Mode**: 3-part structured journey (Foundation → Mechanism → Real World, 150–220 words/part) + 2 quiz questions per part + 1 single key takeaway + Serper news grounding in Part 3.
- **Banked Mastery Quiz Mechanic**: 100% quiz pass score required to advance to the next part. Failed retries reshuffle only missed questions using Fisher-Yates (`frontend/lib/quizShuffle.ts`).
- **Quality Gate**: Flesch-Kincaid grade level evaluation and deterministic auto-fixing (option length balancing, sentence splitting, distractor trimming) tailored to learner levels (Class 6-8, Class 9-10, College).

### D. Security, Auth & User Scoping
- **Clerk JWT Verification (`backend/src/lib/auth.js`)**: Mandatory `azp` validation against canonical production origins (`https://reallearn.site`, `https://www.reallearn.site`, `https://real-learn.onrender.com`).
- **Dynamic User-Scoped Storage (`frontend/lib/userScopedStorage.ts`)**: Zustand stores (`useSavedJourneysStore`, `useProgressStore`, `useLessonStore`, `usePreferenceStore`) dynamically scope localStorage keys by Clerk `userId` (`reallearn-progress:${userId || 'anon'}`). Direct user-to-user switches and sign-outs perform atomic in-memory state wipes.
- **Deterministic Content Moderation (`backend/src/lib/moderation.js`)**: NFKC canonicalization, homoglyph neutralization, syntactic grammar frame parsing, and educational whitelist fast-path.
- **Strict Injective Caching (`backend/src/lib/lessonCache.js`)**: Lesson cache keys hash a JSON-array serialization to prevent character collision injection.

### E. Olive Frenzy Minimal Design System (`frontend/app/globals.css`)
- **Palette**:
  - Light mode: Rich olive `#556B2F` on warm cream paper `#FAF9F3`.
  - Dark mode (default): Glowing lime-olive `#A4C639` on deep olive-black `#121510`.
  - Accent companion: Lime spark `#C3E85B` (light) / `#3F6212` (dark).
  - Success/Progress: Emerald `#10B981` / `#059669`.
  - CRITICAL: In dark mode, `--on-accent` is strictly dark ink `#121510` (never white on lime!).
- **Typography**: Space Grotesk 700 (`--font-display`) for headings; Inter 400 (`--font-sans`) for body. Minimum 16px font-size for mobile lesson prose.
- **Banned Visual Elements**:
  - NO purple/violet and NO gold (owner's strict rule).
  - NO raw unicode emojis in the UI (use SVG icons from `components/shared/icons.tsx`).
  - NO inline style soup — use the design system classes (`.btn-primary`, `.part-card`, `.quiz-sheet`, `.lc`, `.chip`, `.stat-tile`, etc.).
  - NO heavy animated background drifts or decorative clutter.

---

## 2. AUTONOMOUS AUDIT & IMPROVEMENT DIRECTIVES

Execute deep, high-impact improvements across all tiers of the codebase:

### 1. Backend & Inference Engine Optimization
- Audit `backend/src/lib/aiEngine.js`, `backend/src/routes/lesson.js`, `backend/src/lib/qualityGate.js`, `backend/src/server.js`.
- Optimize JSON parsing fast-paths, pre-compiled regexes, and payload serialization.
- Ensure Fastify JIT JSON response schemas (`fast-json-stringify`) are leveraged across all API routes (`/api/ready`, `/api/lesson-cache-check`, `/health`).
- Harden error boundary recovery, stream memory bounding (`MAX_STREAM_CHARS = 2,000,000`), and connection reuse via Undici.
- Ensure Serper news grounding gracefully falls back under timeout without blocking SSE start.

### 2. Frontend Architecture & React 19 Performance
- Audit `frontend/components/learning/`, `frontend/components/homepage/`, `frontend/store/`, `frontend/lib/`.
- Isolate component render trees (e.g. sub-component extraction for timer/reading progress to prevent whole-card re-renders).
- Implement memoization (`useMemo`, `useCallback`) for heavy calculations (tokenization, filtering, mastery frontier graph analysis).
- Verify read-your-writes cache consistency across `debouncedStorage.ts` and `userScopedStorage.ts`.
- Ensure zero layout shifts (CLS), smooth CSS transitions (150–180ms), and full `prefers-reduced-motion` compliance.

### 3. Design System & Invisible UX Polish
- Audit `frontend/app/globals.css` and all component TSX files.
- Purge any remaining inline `style={{ ... }}` objects and replace them with canonical CSS classes and CSS variables.
- Verify color contrast (WCAG 2.1 AA ≥ 4.5:1 for text, ≥ 3:1 for graphical UI elements).
- Ensure all interactive touch targets meet the ≥ 44px minimum sizing rule.
- Verify modal focus trapping (`useFocusTrap`), keyboard navigation (`Enter`, `Esc`, `1-4`/`A-D` quiz hotkeys), and screen reader live regions (`aria-live`).

### 4. Code Quality, Strict Types & Test Hardening
- Ensure 100% clean TypeScript typecheck with zero `any` slips.
- Eliminate dead code, unused imports, stale dependencies, and redundant abstractions.
- Expand backend unit/integration tests (`backend/test/`) and frontend verification scripts (`frontend/scripts/`) to cover new edge cases.

---

## 3. MANDATORY VERIFICATION COMMANDS

You must run and pass every single check before committing:

### Backend Checks (run from `/backend`):
```bash
node --test --test-concurrency=1
```
*Requirement*: All 117+ unit, integration, and security tests must PASS with 0 failures.

### Frontend Checks (run from `/frontend`):
```bash
node node_modules/typescript/bin/tsc --noEmit
npx eslint .
npm run build
node scripts/verify-quiz-shuffle.mjs
node scripts/verify-achievements.mjs
node scripts/verify-frontier.mjs
node scripts/verify-learning-profile.mjs
node scripts/verify-onboarding.mjs
node scripts/verify-personalization.mjs
node scripts/verify-reconsent-copy.mjs
node scripts/verify-special-days.mjs
node scripts/verify-user-scoping.mjs
```
*Requirement*: 0 TypeScript errors, 0 ESLint errors/warnings, Turbopack build succeeds for all routes, and all 9 verify scripts report clean PASS.

---

## 4. DOCUMENTATION & PROTOCOL INVARIANTS

Every single change triggers the mandatory **Change Protocol**:
1. **Update `docs/AGENT_MEMORY.md`**:
   - Add a detailed entry in §13 Changelog with date, architectural summary, before/after impact, and verification results.
   - Update any affected system reference sections, tables, or baselines.
2. **Append to `change-made-after-submission.md`**:
   - Add a structured entry with the date, summary of issues addressed, root causes, technical fixes, and test results.

---

## 5. GIT & PULL REQUEST CREATION PROTOCOL

Once all code changes and documentation are complete and verified:

1. **Create a Feature Branch**:
   ```bash
   git checkout -b <type>/<descriptive-slug>
   # Example: git checkout -b feat/autonomous-fullstack-optimization
   ```

2. **Commit with Conventional Commit Format**:
   ```bash
   git add -A
   git commit -m "feat(core): autonomous full-stack performance, security & design system overhaul"
   ```

3. **Push to Remote**:
   ```bash
   git push origin <branch-name>
   ```

4. **Create the Pull Request**:
   Use `gh pr create` with a structured, professional PR body:
   ```bash
   gh pr create --title "feat: Autonomous Full-Stack Architecture, Performance & Security Polish" --body "$(cat << 'EOF'
   ## Summary of Changes
   - **Backend & AI Engine**: [Detail exact improvements in aiEngine.js, Fastify schemas, caching, error recovery]
   - **Frontend & State Architecture**: [Detail React 19 memoization, render tree isolation, storage scoping]
   - **Design System & UX**: [Detail Olive Frenzy compliance, inline style cleanup, WCAG AA accessibility]
   - **Security & Quality Gate**: [Detail origin hardening, CSP, Flesch-Kincaid auto-fix enhancements]

   ## Empirical Verification
   - `node --test`: 117/117 tests passing (100% green)
   - `tsc --noEmit`: 0 TypeScript errors
   - `eslint`: 0 warnings, 0 errors
   - `npm run build`: Production Turbopack build succeeded across all routes
   - All 9 verify scripts verified cleanly

   ## Updated Documentation
   - `docs/AGENT_MEMORY.md`
   - `change-made-after-submission.md`
   EOF
   )"
   ```

---
**EXECUTE NOW.** Begin by inspecting the current codebase, identifying opportunities for enhancement, and implementing them autonomously.
```
