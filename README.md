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
5. **Evergreen Design System**: calm, readable, WCAG-AA-verified — green-tinted paper daylight (`#F6F8F6`) / forest-black night (`#0B100E`) themes with a deep emerald (`#047857`) / soft mint (`#34D399`) accent and a warm amber companion for celebration moments (no neon, strictly zero purple/violet). Full spec: [`docs/REDESIGN.md`](docs/REDESIGN.md).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Clerk Auth, Zustand state management |
| **Backend** | Node.js, Express API, Server-Sent Events (SSE) streaming |
| **AI Inference Engine** | Google Gemma 4 (Cerebras Cloud primary, Cloudflare Workers AI fallback with circuit-breaker) |
| **Live Grounding** | Serper API for live news and web context |
| **Caching & DB** | Two-tier LRU memory cache + MongoDB persistent cache |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ and npm installed

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
The backend API server will run on `http://localhost:5000` (or configured `PORT`).

---

## 🧪 Verification & Build Commands

Always verify changes locally before pushing:

```bash
# Frontend Verification (from /frontend)
npx tsc --noEmit          # TypeScript check (must be 0 errors)
npx next lint             # Next.js lint check
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
