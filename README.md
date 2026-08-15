# RealLearn AI

> **The World Is Your Textbook.**
> RealLearn transforms any query into a structured, 3-part interactive learning journey grounded in live news, native languages, and quiz-gated progression.

---

## 🌟 Overview

RealLearn is an AI-native educational platform designed for deep understanding rather than disposable one-line answers.

When a learner asks a question:
1. **Three-Stage Progression**: The app generates a 3-part lesson:
   - **Part 1: Foundation** — Core concepts & fundamental intuition.
   - **Part 2: Mechanism** — Step-by-step inner workings & mechanics.
   - **Part 3: Real World** — Real-life applications grounded with live news updates (via Serper API).
2. **Quiz-Gated Mastery**: Each part is locked behind a 2-question quiz. Learners must achieve **100% score** to unlock the next part.
3. **Multilingual & Adaptive**: Supports 12 Indian languages and 3 difficulty levels — from middle-school foundations to college/advanced. (RealLearn is intended for learners aged 13+; the entry-level tier reflects content difficulty, not target age.)
4. **Learning Personalization**: Optional user learning preferences and notes seamlessly injected into AI prompt generation.
5. **Olive Frenzy Minimal Design System**: "frenzy in minimalism" — one rich-olive accent family (`#556B2F` on warm cream `#FAF9F3` light mode, glowing lime-olive `#A4C639` on deep olive-black `#121510` dark mode), emerald success, expressive script display type tilted over stark geometric cards, a kinetic hero ticker, and razor-sharp geometric sans UI micro-copy (strictly zero purple/violet, zero gold). Canonical spec: [`docs/AGENT_MEMORY.md`](docs/AGENT_MEMORY.md) §1; history: [`docs/REDESIGN.md`](docs/REDESIGN.md).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TypeScript, hand-rolled CSS design system (globals.css), Clerk Auth, Zustand state management |
| **Backend** | Node.js, Express API, Server-Sent Events (SSE) streaming |
| **AI Inference Engine** | Google Gemma 4 (Cerebras Cloud primary, NVIDIA NIM fallback, Cloudflare Workers AI last-resort fallback with circuit-breaker) |
| **Live Grounding** | Serper API for live news and web context |
| **Caching & DB** | Two-tier LRU memory cache + MongoDB persistent cache |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 24+ (LTS) and npm installed (see `.nvmrc`)

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend web app will run on `http://localhost:3000`.

### 3. Backend Setup
```bash
cd backend
npm install
npm start
```
The backend API server will run on `http://localhost:10000` (or configured `PORT`).

---

## 🧪 Verification & Build Commands

Always verify changes locally before pushing:

```bash
# Frontend Verification (from /frontend)
npx tsc --noEmit          # TypeScript check (must be 0 errors)
npm run lint              # ESLint (flat config — Next 16 removed `next lint`)
npm run build             # Production Next.js build verification

# Backend Verification (from /backend)
npm test                  # AI engine, moderation, and quiz validation tests
```

---

## 📚 Documentation Map

- **[`docs/AGENT_MEMORY.md`](docs/AGENT_MEMORY.md)** — Canonical Single Source of Truth for AI Agents (Architecture, layout, conventions, rules).
- **[`change-made-after-submission.md`](change-made-after-submission.md)** — Comprehensive running changelog of all features, fixes, and updates.
- **[`llms.txt`](llms.txt)** & **[`llms-full.txt`](llms-full.txt)** — Machine-readable summary of product facts and brand context.
- **[`GEMINI.md`](GEMINI.md)** — Core guidelines and instructions for AI agents working in this repository.

---

## 🔒 Security & Governance

- **[`SECURITY.md`](SECURITY.md)** — Security disclosure policy.
- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — Contribution guidelines.
- **[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)** — Code of conduct.
- **[`LICENSE`](LICENSE)** — Project license.
