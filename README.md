# RealLearn

RealLearn is an AI-powered learning product that turns a single question into a structured, high-retention learning journey.
Instead of giving one generic answer, RealLearn teaches in stages, checks understanding, and then connects learning to what is happening in the real-world right now.

## Product Preview

![RealLearn product preview](https://github.com/user-attachments/assets/835f71a3-ce53-415e-813f-00a2e57ecc51)

## Live Product, Demo, and Competition Write-up

- **Live Product:** [https://reallearn-taupe.vercel.app/](https://reallearn-taupe.vercel.app/)
- **Demo Video:** [Watch Demo Video](https://youtu.be/zehBGs-xBC0)
- **Kaggle Write-up (Gemma 4 Good Hackathon):** [Read the write-up](https://www.kaggle.com/competitions/gemma-4-good-hackathon/writeups/new-writeup-1778215573161) 

The Kaggle write-up explains the project story, motivation, and implementation choices made for the Gemma 4 Good Hackathon submission. It is useful for understanding the product vision and the decision-making behind the architecture.

---
## Gemma 4 Usage

RealLearn is powered by **Gemma 4 (gemma-4-26b-a4b-it)** through the Gemini API. We deliberately designed a sophisticated prompting and post-processing strategy to maximize reliability, educational quality, and consistency.

### Key Technical Highlights

- **Structured Output Enforcement**: A carefully engineered system prompt forces Gemma 4 to return a strict JSON schema with exactly three progressive parts. Each part includes rich educational content and precisely two multiple-choice quiz questions (4 options each).

- **Native Multilingual Generation**: Lessons are generated directly in the learner’s chosen language (English, Hindi, Gujarati, Tamil, Bengali, Marathi, Telugu, or Kannada) rather than post-translation. This preserves cultural nuance and natural tone.

- **Adaptive Difficulty Calibration**: The prompt dynamically adjusts depth, vocabulary, and complexity based on the selected learner level (Class 6–8, Class 9–10, or College/Advanced).

- **Real-World Grounding via Serper**: Before calling Gemma, the backend fetches recent India-relevant news using Serper API. This context is injected into the prompt so **Part 3** naturally connects theory to current real-world events with actual names, dates, and numbers.

- **Robustness Engineering**:
  - 5-stage JSON repair pipeline (stripping thinking tokens, fixing markdown fences, handling truncated output, removing trailing commas, etc.)
  - Strict schema validation before streaming to frontend
  - Fallback mechanisms to ensure high lesson success rate

This architecture allows us to reduce average generation time to **15-25 seconds** while maintaining high structural integrity and educational value.

Gemma 4’s strong reasoning capabilities, combined with our deliberate prompting and reliability layer, enable RealLearn to deliver coherent, progressive, and context-aware learning journeys instead of generic one-shot answers.
## Table of Contents

- [What RealLearn is](#what-reallearn-is)
- [What problem it solves](#what-problem-it-solves)
- [How RealLearn works end-to-end](#how-reallearn-works-end-to-end)
- [Detailed feature breakdown](#detailed-feature-breakdown)
- [How RealLearn helps in the real-world](#how-reallearn-helps-in-the-real-world)
- [Tech stack](#tech-stack)
- [Architecture and deployment](#architecture-and-deployment)
- [API behavior and SSE streaming](#api-behavior-and-sse-streaming)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Validation commands](#validation-commands)
- [Roadmap ideas](#roadmap-ideas)
- [License](#license)

---

## What RealLearn is

RealLearn is a guided-learning platform built for students who want:

- better clarity on difficult topics,
- less confusion from random internet answers,
- learning in their own language,
- and a path from theory to real-world relevance.

At a product level, RealLearn combines:

1. **AI lesson generation** (Gemma-powered),
2. **learning design** (3-part progression),
3. **active recall checks** (quiz gates),
4. **real-world grounding** (news context for Part 3).

---

## What problem it solves

Traditional AI Q&A often gives a one-shot answer that is:

- too shallow for deep understanding,
- too advanced for beginners,
- not connected to current reality,
- and easy to forget because users do not actively engage.

RealLearn solves this by converting a question into an intentional learning journey:

- **Part 1** creates foundation,
- **Part 2** explains mechanism and deeper logic,
- **Part 3** bridges theory with real-world context and current events.

This makes the experience closer to guided teaching than simple answer retrieval.

---

## How RealLearn works end-to-end

1. Learner enters a question on the homepage.
2. Learner chooses language and level.
3. Frontend sends request to backend (`/api/generate-lesson`).
4. Backend gathers real-world context (news) where available.
5. Backend prompts Gemma to generate a strict JSON lesson journey.
6. Backend validates lesson format before returning it.
7. Frontend renders 3-part content with sources and quiz for each part.
8. Learner must pass each part’s quiz to unlock the next.
9. On completion, learner sees key takeaways and can ask follow-up questions.

---

## Detailed feature breakdown

### 1) 3-part unlockable lesson journey

Each lesson always has exactly three parts:

- **Part 1: Foundation** — beginner-friendly framing
- **Part 2: Mechanism** — deeper “how/why” layer
- **Part 3: Real world now** — practical relevance using recent context

This sequencing prevents cognitive overload and supports stronger understanding.

### 2) Quiz-gated progression

- 2 MCQs per part
- 4 options per MCQ
- User must get full score in a part quiz to unlock next part

This encourages active reading and comprehension before progression.

### 3) Multi-language learning support

Frontend provides language choices including:

- English
- Hindi
- Gujarati
- Tamil
- Bengali
- Marathi
- Telugu
- Kannada

This reduces access barriers and improves comfort for learners.

### 4) Adaptive depth by learner level

Supported levels:

- Class 6–8
- Class 9–10
- College / Advanced

Depth, terminology, and complexity are adjusted by selected level.

### 5) Real-world context integration

When possible, backend fetches recent news context and injects it into lesson generation so Part 3 is grounded in practical, current examples rather than abstract theory.

### 6) Streaming generation with keep-alive (SSE)

To support longer generation times, backend uses Server-Sent Events and sends heartbeat `ping` events periodically while generation is in progress.

### 7) Better reliability against model formatting issues

Backend includes JSON repair and schema validation to reduce failures caused by malformed model output.

### 8) Follow-up learning loop

After finishing a journey, learners can ask a follow-up question and immediately begin a new 3-part journey.

### 9) Session-persisted state

The frontend stores journey state in session storage so progress and context remain available during the active session.

---

## How RealLearn helps in the real-world

RealLearn is designed to fix concrete learning issues:

- **Issue: “I don’t know where to start.”**  
  **Fix:** Part 1 creates an accessible entry point.

- **Issue: “I read but don’t truly understand.”**  
  **Fix:** Quiz-gated progression checks comprehension.

- **Issue: “This feels theoretical and disconnected.”**  
  **Fix:** Part 3 links concepts to ongoing real-world events.

- **Issue: “Content is either too basic or too complex.”**  
  **Fix:** Learner-selected level adjusts depth.

- **Issue: “English-only content blocks some students.”**  
  **Fix:** Multi-language lesson generation improves accessibility.

Overall outcome: clearer understanding, stronger retention, and better transfer from concept to real-world thinking.

---

## Tech Stack

### Frontend (Vercel)

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19
- **Language:** TypeScript
- **State:** Zustand + persistence middleware
- **Rendering:** React Markdown + remark-gfm
- **Styling:** Tailwind CSS config + custom global/component styles

### Backend (Render)

- **Runtime:** Node.js
- **Framework:** Express
- **API:** JSON + SSE streaming
- **CORS:** Configured with allowed frontend origins
- **AI:** Gemma API integration for lesson generation
- **Context:** Serper API integration for news grounding
- **Safety/Reliability:** Output validation + JSON repair strategies + timeout handling

---

## Architecture and deployment

This repository is intentionally split into two deployable services:

- `frontend/` → Next.js app → deploy on **Vercel**
- `backend/` → Express API → deploy on **Render**

Frontend communicates with backend using:

- `POST /api/generate-lesson`

Operational endpoint:

- `GET /health`

---

## API behavior and SSE streaming

`/api/generate-lesson` streams events to the frontend:

- `event: ping` → keep-alive heartbeat while generation is running
- `event: lesson` → final lesson payload
- `event: done` → successful stream end
- `event: error` → failure message

This design improves UX for long-running model calls and avoids silent connection timeouts.

---

## Project structure

```text
Real-learn/
├── frontend/         # Next.js app (UI, state, client flow)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── store/
│   └── types/
├── backend/          # Express API, AI calls, validation, context fetch
│   └── src/
└── README.md
```

---

## Environment variables

### Frontend

- `NEXT_PUBLIC_BACKEND_URL=https://<your-render-backend>.onrender.com`

### Backend

- `GEMMA_API_KEY=...`
- `GEMMA_MODEL=gemma-4-26b-a4b-it` (optional)
- `GEMMA_FALLBACK_MODELS=model-a,model-b` (optional)
- `GEMMA_MAX_RETRIES=2` (optional; retries per model on 429/5xx/network errors)
- `GEMMA_RETRY_DELAY_MS=700` (optional base backoff in milliseconds)
- `GEMMA_MAX_RETRY_DELAY_MS=5000` (optional cap for exponential backoff delay)
- `SERPER_API_KEY=...`
- `FRONTEND_ORIGIN=https://<your-vercel-frontend>.vercel.app`
- `PORT=10000` (optional on Render)

---

## Local development

Open two terminals.

### Terminal 1: Backend

```bash
cd backend
npm install
npm start
```

### Terminal 2: Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend reads backend base URL from `frontend/.env.local`.

---

## Validation commands

From `frontend/`:

```bash
npm run lint
npm run build
```

---

## Roadmap ideas

- richer analytics for learning outcomes,
- optional spaced repetition on takeaways,
- user accounts and long-term progress tracking,
- classroom/teacher mode,
- multilingual voice input and output.

---

## License

This project is licensed under the **MIT License**.
See [LICENSE](./LICENSE) for full text.
