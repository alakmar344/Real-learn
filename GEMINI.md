# GEMINI.md — Instructions for Gemini & AI Agents

> **MANDATORY FOR ALL AI AGENTS**: Read this file and `docs/AGENT_MEMORY.md` at the start of EVERY conversation and before making ANY changes to this repository.

## 1. Core Principles & Philosophy
1. **Never guess code logic, schemas, or file paths**: Inspect the authoritative source using file tools before editing.
2. **Never swallow exceptions or patch symptoms**: Trace root causes.
3. **Never declare success without empirical verification**: Run tests/builds (`npx tsc`, `npx next lint`, `npm run build`).
4. **Preserve the RealLearn Brand DNA & Tactile Folio System**: Sunlight Alabaster Paper `#FAF9F6` (day) / Midnight Obsidian Slate `#0D1117` (night) canvases, Solar Terracotta (`#EE5125` light / `#FF6435` dark) primary interactive accent (`--accent`), Slate Cobalt (`#1E293B`) grounding secondary, Sage Emerald (`#04A16C` / `#00D284`) success indicator, WCAG-AA-verified pairings, body text weight 400. NO neon, NO purple/violet. JS-side brand colors come from `frontend/lib/palette.ts`. Spec: `docs/REDESIGN.md`.
5. **Zero Cognitive Load / Invisible UX**: Keep UI clean, simple, and intuitive. High complexity stays in the code, hidden from users.

## 2. Change Protocol
For EVERY change:
1. Update `docs/AGENT_MEMORY.md` with the new state.
2. Append a record to `change-made-after-submission.md`.
3. Verify build & typecheck locally (`npm run build`).
4. Commit & push via PR (`gh pr create`).

## 3. Project Quick Reference
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind + Clerk + Zustand (`/frontend`)
- **Backend**: Node + Express (`/backend`)
- **Single Source of Truth**: `docs/AGENT_MEMORY.md`
