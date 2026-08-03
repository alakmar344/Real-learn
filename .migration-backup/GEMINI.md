# GEMINI.md — Instructions for Gemini & AI Agents

> **MANDATORY FOR ALL AI AGENTS**: Read this file and `docs/AGENT_MEMORY.md` at the start of EVERY conversation and before making ANY changes to this repository.

## 1. Core Principles & Philosophy
1. **Never guess code logic, schemas, or file paths**: Inspect the authoritative source using file tools before editing.
2. **Never swallow exceptions or patch symptoms**: Trace root causes.
3. **Never declare success without empirical verification**: Run tests/builds (`npx tsc`, `npx next lint`, `npm run build`).
4. **Preserve the Cyber Aqua Design System**: electric cyan (`#06B6D4` dark) / teal (`#0891B2` light) as the ONE interactive accent, hot pink (`#EC4899` / `#DB2777`) as the energy companion for celebration moments, cyan→pink gradients (`--accent-gradient`, `--text-pop-gradient`) reserved for CTAs and display text, emerald (`#10B981` / `#059669`) for success/progress, dopamine subject-color spectrum for chips, deep space dark mode `#0A0A0F` (default) and clean light mode `#FAFAFA`, WCAG-AA-verified pairings, body text weight 400. NO purple/violet and NO gold. JS-side brand colors come from `frontend/lib/palette.ts`. Spec history: `docs/REDESIGN.md`; canonical description: `docs/AGENT_MEMORY.md` §1.
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
