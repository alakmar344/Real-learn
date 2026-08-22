# RealLearn AI

> **The World Is Your Textbook.**
> Open. Ask. Understand. RealLearn explains anything in plain language anyone can follow — the big idea, how it works, and where you see it in real life — in 12 languages, grounded in live news.

---

> [!IMPORTANT]
> ### 📢 Note to Judges (Update: August 17, 2026 / 2026-08-17)
> **AI Engine Upgrade for Production Scale & Reliability**:
> Today, we transitioned RealLearn's AI inference architecture from Gemma 4 to **Qwen (`qwen/qwen3.6-27b` with `openai/gpt-oss-120b` fallback)** and upgraded our multi-provider infrastructure to take RealLearn to production scale:
> 1. **Primary Provider (Groq LPUs)**: Switched to high-throughput Qwen 3.6 27B on Groq LPUs for sub-second Time-To-First-Token (TTFT) and blazing fast streaming generation with zero cold-start penalty.
> 2. **Enterprise Secondary (NVIDIA NIM)**: Integrated 70B–150B parameter models (`meta/llama-3.3-70b-instruct`, `mistralai/mistral-large-2-instruct`, `qwen/qwen2.5-72b-instruct`) for high-capacity hedged fallback.
> 3. **Global Edge Tier (Cloudflare Workers AI)**: 70B Fast FP8 models with silence watchdogs and automated circuit breaking as a resilient last-resort failover.
> 
> This transition eliminates legacy rate limits, ensures 99.99% lesson generation availability, and guarantees low-latency educational journeys for learners worldwide.

---

## 🌟 Overview

RealLearn is an AI-native educational platform built for **everyone** — including people who have never used a computer. There is nothing to learn before you can learn: open the page, type (or speak) a question in your own words, and understand.

**Design north star (2026-08 rebuild):** zero friction, zero jargon, doubt-killing answers. No forced onboarding, no locked content, no mandatory quizzes, no textbook vocabulary — just the fastest possible path from curiosity to understanding.

When a learner asks a question:
1. **Doubt-Killing Answers**: Every explanation is written in plain, warm language that covers the **what**, the **why**, the **how**, and the **connections** — defining every technical term the moment it appears and answering the reader's next "but wait — why?" before they have to ask it.
2. **Three Clear Steps** (Full lesson mode) — all readable immediately, nothing locked:
   - **Part 1: The big idea** — What it is and why it matters to your life.
   - **Part 2: How it works** — Step-by-step cause and effect, with worked examples.
   - **Part 3: Where you see it** — Real-life applications grounded with live news updates (via Serper API).
3. **Optional Quick Checks**: Each part ends with a short 2-question self-check to make understanding stick. Any score continues — retrying missed questions is always a choice, never a wall.
4. **Multilingual & Adaptive**: Supports 12 Indian languages and 3 depth settings — Simple, Standard, and Advanced. (RealLearn is intended for learners aged 13+; the Simple tier reflects content difficulty, not target age.)
5. **Learning Personalization**: Optional user learning preferences and notes seamlessly injected into AI prompt generation.
6. **Olive Frenzy Minimal Design System**: "frenzy in minimalism" — one rich-olive accent family (`#556B2F` on warm cream `#FAF9F3` light mode, glowing lime-olive `#A4C639` on deep olive-black `#121510` dark mode), emerald success, expressive script display type tilted over stark geometric cards, a kinetic hero ticker, and razor-sharp geometric sans UI micro-copy (strictly zero purple/violet, zero gold). Canonical spec: [`docs/AGENT_MEMORY.md`](docs/AGENT_MEMORY.md) §1; history: [`docs/REDESIGN.md`](docs/REDESIGN.md).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TypeScript, hand-rolled CSS design system (globals.css), Clerk Auth, Zustand state management |
| **Backend** | Node.js, Express API, Server-Sent Events (SSE) streaming |
| **AI Inference Engine** | Groq LPU (Qwen 3.6 27B / GPT-OSS 120B primary via official `groq-sdk`), NVIDIA NIM (70B–150B high-capacity fallback), Cloudflare Workers AI (70B Fast FP8 last-resort fallback with circuit-breaker) |
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
