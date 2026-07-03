# RealLearn

### The World Is Your Textbook. Your Choice, Your Pace.

**RealLearn turns any question into a guided learning experience — at the speed and depth that work for you.**

Ask anything. Choose your learning mode, and RealLearn instantly builds it:

- **⚡ Fast Mode** — One focused, direct answer in **5–12 seconds**. Perfect for quick understanding, instant refreshers, or when you're in a hurry. One quiz to prove you got it.
- **📚 Explain Mode** — A deep three-part journey in **15–25 seconds** that starts from the ground up, deepens into the *how* and *why*, and connects theory to what's happening in the real world **right now**. Three parts, three quizzes, genuine mastery.

Either way, you prove your understanding with quizzes, so you don't just consume — you actually *learn*. And it speaks your language: eight of them, across three difficulty levels. Pick from three beautiful themes: Paper (light), Night (dark), or the brand new Twilight (indigo + violet).

This isn't search. This isn't a chatbot. This is **teaching, on demand. Your pace. Your depth. Your time.**

---

## Product Preview

![RealLearn product preview](https://github.com/user-attachments/assets/835f71a3-ce53-415e-813f-00a2e57ecc51)

## See It Live

- 🚀 **Live Product:** [https://reallearn.site/](https://reallearn.site/)
- 🎬 **Demo Video:** [Watch the Demo](https://youtu.be/zehBGs-xBC0)
- 📄 **Info Page:** [See the Info Page](https://reallearn-info.vercel.app)
- 🏆 **Kaggle Write-up (Gemma 4 Good Hackathon):** [Read the story behind it](https://www.kaggle.com/competitions/gemma-4-good-hackathon/writeups/new-writeup-1778215573161)

> The Kaggle write-up explains the project story, motivation, and the engineering decisions behind the architecture — built for the **Gemma 4 Good Hackathon**.

---

## Table of Contents

- [The Problem We're Solving](#the-problem-were-solving)
- [The RealLearn Promise](#the-reallearn-promise)
- [How It Works — Your Journey, Step by Step](#how-it-works--your-journey-step-by-step)
- [Powered by Gemma 4](#powered-by-gemma-4)
- [The Feature Tour](#the-feature-tour)
  - [1. Fast & Explain Modes](#1-fast--explain-modes)
  - [2. The Three-Part Learning Journey (Explain Mode)](#2-the-three-part-learning-journey-explain-mode)
  - [3. Quiz-Gated Progression](#3-quiz-gated-progression)
  - [4. Learn in Your Language](#4-learn-in-your-language)
  - [5. Adaptive Difficulty](#5-adaptive-difficulty)
  - [6. Grounded in Today's Real World](#6-grounded-in-todays-real-world)
  - [7. A Cinematic, Calm Experience](#7-a-cinematic-calm-experience)
  - [8. Your Personal Learning Library](#8-your-personal-learning-library)
  - [9. The Follow-Up Loop](#9-the-follow-up-loop)
  - [10. Designed for Everyone — Accessibility First](#10-designed-for-everyone--accessibility-first)
  - [11. Three Beautiful Themes](#11-three-beautiful-themes)
- [Built Like Production Software](#built-like-production-software)
  - [Reliability Engineering](#reliability-engineering)
  - [Safety & Content Moderation](#safety--content-moderation)
  - [Security & Privacy](#security--privacy)
- [Real-World Outcomes](#real-world-outcomes)
- [The Technology](#the-technology)
- [Architecture & Deployment](#architecture--deployment)
- [API Behavior & SSE Streaming](#api-behavior--sse-streaming)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Validation Commands](#validation-commands)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## The Problem We're Solving

You have a question. You search it, and you get a wall of links. Or you ask an AI, and you get one paragraph that is either:

- **Too shallow** to truly understand,
- **Too advanced** for where you actually are,
- **Disconnected** from the real world, or
- **Instantly forgettable**, because you never had to engage with it.

The result? You *consumed* an answer, but you didn't *learn* anything.

Traditional Q&A treats knowledge like a vending machine — insert question, receive answer. But real learning doesn't work that way. Real learning is a *journey*: a foundation, a mechanism, a connection to reality — checkpointed by moments where you prove to yourself that it stuck.

**RealLearn rebuilds that journey, automatically, for any question, in seconds.**

---

## The RealLearn Promise

At its heart, RealLearn fuses four things that almost never appear together:

| | |
|---|---|
| 🧠 **AI lesson generation** | Powered by Google's **Gemma 4**, every lesson is generated fresh for your exact question. |
| 🪜 **Learning design** | A deliberate three-stage progression — Foundation → Mechanism → Real World. |
| ✅ **Active recall** | Quiz gates after every part. You can't skip ahead until you've understood. |
| 🌍 **Real-world grounding** | Live news context is woven into Part 3, so theory meets today. |

The outcome is an experience that feels less like *querying a database* and more like *being taught by a patient, knowledgeable tutor* who always knows what's happening in the world.

---

## How It Works — Your Journey, Step by Step

1. **Ask.** Type any question on the homepage — *"How do black holes work?"*, *"Why did inflation rise in 2024?"*, *"What is photosynthesis?"*
2. **Choose your mode.** Pick **⚡ Fast** (one instant answer) or **📚 Explain** (deep 3-part journey). Or use your saved preference.
3. **Personalize.** Choose your **language** (8 options) and your **level** (Class 6–8, Class 9–10, or College / Advanced).
4. **Watch it build.** A cinematic loading experience plays while RealLearn works. The backend fetches **fresh real-world news context** (Explain mode only), then prompts **Gemma 4** to compose your lesson — streamed back live over a keep-alive connection.

**Fast Mode (One Quick Answer):**
- 5. A single, focused answer (~200 words) in clean Markdown.
- 6. Prove it: One quick 2-question quiz.
- 7. Done. Your instant answer mastered.

**Explain Mode (Three-Part Deep Dive):**
- 5. **Learn Part 1 — Foundation.** A beginner-friendly framing of the core idea, with real source links and a built-in reading timer.
- 6. **Prove it.** A two-question quiz slides up. Get a **perfect score** to unlock the next part. Every answer comes with an *exhaustive, mini-lesson explanation*.
- 7. **Unlock Part 2 — Mechanism.** A satisfying unlock animation flashes, and the deeper "how and why" layer opens up.
- 8. **Unlock Part 3 — Real World Now.** The final part connects the concept to **current events** — with real names, dates, and numbers pulled from live news.

For Both Modes:
- 9. **Complete.** A celebratory completion screen shows your score with animated confetti and key takeaways.
- 10. **Keep going.** Ask a **follow-up question** to spin up a brand-new journey instantly — or revisit any past lesson from your saved library.

Everything you do is **persisted automatically**, so you can close the tab and pick up exactly where you left off.

---

## Powered by Gemma 4

RealLearn runs on **Gemma 4 (`gemma-4-26b-a4b-it`)** via the Gemini API — and we didn't just call the model and hope for the best. We engineered two sophisticated mode-aware prompting systems and a reliability layer around it to guarantee educational quality and structural consistency on every single request, whether you're asking for a quick answer or a deep dive.

### Key Technical Highlights

- **🎯 Structured Output Enforcement.** Mode-aware system prompts (GENERATE_FAST_ANSWER_PROMPT for fast, GENERATE_LESSON_PROMPT for explain) force Gemma 4 to return strict JSON schemas: Fast mode returns 1 part with 2 quiz questions; Explain mode returns exactly 3 progressive parts, each with 2 questions (4 options each). Quiz explanations are exhaustive teaching — 2–4 sentences for fast mode, 2–4 sentences for explain mode — never just an answer key.

- **🌐 Native Multilingual Generation.** Lessons are generated *directly* in the learner's chosen language — English, Hindi, Gujarati, Tamil, Bengali, Marathi, Telugu, or Kannada — never machine-translated afterward. This preserves cultural nuance, natural tone, and authenticity. (JSON keys stay in English so the app stays robust.)

- **📈 Adaptive Difficulty Calibration.** The prompt dynamically adjusts depth, vocabulary, and complexity based on the selected level — simple language and basic examples for Class 6–8, moderate technical depth for Class 9–10, and high-rigor terminology for College / Advanced.

- **📰 Real-World Grounding via Serper (Explain Mode Only).** *Before* calling Gemma for Explain mode, the backend fetches recent, India-relevant news using the **Serper API** and injects it straight into the prompt. This means **Part 3** connects theory to actual current events — with real names, dates, and figures. (Fast mode skips this entirely to prioritize speed.)

- **🛡️ Robustness Engineering.** Model output is never trusted blindly:
  - A multi-stage **JSON repair pipeline** strips "thinking" tokens, removes Markdown code fences, closes truncated output, drops trailing commas, and re-attempts parsing through several escalating recovery strategies.
  - **Strict schema validation** runs before anything is streamed to your screen — wrong shape, wrong part count, or malformed quizzes are rejected automatically.
  - **Clear, human error messages** appear when the model is briefly unavailable after retries, so you're never left staring at a broken screen.

**Speed Optimization:** Fast mode skips the news fetch entirely (no Serper round-trip) and caps Gemma output at 1200 tokens, yielding answers in **5–12 seconds**. Explain mode stays brisk at **15–25 seconds** thanks to tighter prompts (200–280 words/part, 2–4 sentence quiz explanations) and the same reliability infrastructure.

Gemma 4's strong reasoning, combined with our deliberate prompting and reliability layer, is what lets RealLearn deliver coherent, progressive, context-aware journeys instead of generic one-shot answers.

---

## The Feature Tour

### 1. Fast & Explain Modes

**You choose how deep to go:**

- **⚡ Fast Mode** — One direct, focused answer (~200 words) delivered in **5–12 seconds**. Perfect for quick understanding, instant refreshers, or when you're in a hurry. No news fetch, minimal model output budget, maximum speed. One 2-question quiz to prove you got it.

- **📚 Explain Mode** — The classic three-part deep dive delivered in **15–25 seconds**. Perfect for genuine learning: foundation, mechanism, real-world connection grounded in live news. Three parts, each with a 2-question quiz gate, plus key takeaways.

Your choice is saved as a preference (defaults to Fast), so every new question uses your preferred depth unless you switch. The mode toggle lives right on the home question input, in Settings, and as a badge on the learn page.

### 2. The Three-Part Learning Journey (Explain Mode)

When you choose Explain mode, every lesson has **exactly three parts** — a structure designed by cognitive-science principles to prevent overload and build durable understanding:

- **Part 1 — Foundation:** The accessible entry point. Beginner-friendly framing that gives you a place to stand.
- **Part 2 — Mechanism:** The deeper layer. The logic, the "how" and the "why," with worked examples.
- **Part 3 — Real World Now:** The payoff. Where the concept lives in today's world, grounded in current events pulled from live news.

Each part arrives with **real source links** (so you can verify and go deeper) and a **subject badge** auto-classified across 11 disciplines — Physics, Chemistry, Economics, Biology, CS, History, Geography, Mathematics, Political Science, Environmental Science, or General — each color-coded in a muted academic palette.

### 3. Quiz-Gated Progression

This is the heart of *active learning*. After each part:

- **2 questions**, **4 options** each.
- A built-in **reading timer** gently encourages you to actually read before the quiz opens.
- You must score **100%** to unlock the next part — no skipping, no skimming.
- Every answer reveals a **deep, exhaustive explanation**: the historical context, the underlying theory, *why* the right answer is right, and *why each wrong option is wrong*.
- Wrong answers shake; correct answers pulse. Feedback is immediate and tactile.

The quiz isn't a test that judges you — it's a **comprehension gate that protects your understanding** before you move on.

### 4. Learn in Your Language

RealLearn meets learners where they are, generating full lessons natively in:

> **English · Hindi · Gujarati · Tamil · Bengali · Marathi · Telugu · Kannada**

This dramatically lowers the access barrier for millions of students for whom English-only content is a wall, not a window.

### 5. Adaptive Difficulty

One topic, three depths. Pick the level that fits you and the entire lesson — vocabulary, examples, and rigor — adapts:

- **Class 6–8** — simple, friendly, concrete.
- **Class 9–10** — balanced technical depth.
- **College / Advanced** — full rigor and precise terminology.

### 6. Grounded in Today's Real World (Explain Mode)

When you ask about a concept in Explain mode, RealLearn quietly searches recent news in the background and threads what's happening *right now* into your final lesson part. Economics ties to this quarter's headlines; physics ties to the latest discovery; history ties to current parallels. **Theory stops feeling theoretical.** (Fast mode skips this to prioritize speed.)

### 7. A Cinematic, Calm Experience

RealLearn is designed to feel like a quiet, beautiful study space — not a noisy app:

- A **cinematic loading screen** with a glowing radial backdrop and rotating, reassuring messages keeps you company while your lesson builds.
- A **progress rail** (Explain mode) shows your three-part journey as connected nodes that fill from locked → active → complete. (Fast mode shows a quick-answer badge instead.)
- A full-screen **unlock animation** rewards every part you clear.
- A **completion screen** celebrates the finish with an animated score ring and falling confetti.
- **Toast notifications** quietly confirm milestones — *"Lesson ready!"*, *"Journey complete!"*
- Typography is intentional and editorial: **Playfair Display** for headlines, **Inter** for the interface, **Lora** for reading content, and **JetBrains Mono** for code — a book-like, scholarly aesthetic throughout.

### 8. Your Personal Learning Library

Every journey you complete is **automatically saved** to a sidebar library. Reopen any past lesson to review or retake it. Journeys are intelligently de-duplicated by a stable signature (your question + first part), so revisiting a topic updates the entry instead of cluttering your history. You're always in control — remove individual journeys or clear them all.

### 9. The Follow-Up Loop

Curiosity doesn't stop at one question. When you finish a journey (Fast or Explain), a **Follow-Up box** invites you to go deeper. Ask a new question and a fresh lesson spins up instantly — no trip back to the homepage required. Learning becomes a continuous flow, not a series of dead ends.

### 10. Designed for Everyone — Accessibility First

Accessibility isn't an afterthought here — it's wired into the foundation, targeting **WCAG 2.1 Level AA**:

- A **skip-to-content** link for keyboard users.
- **ARIA live regions** that announce loading, unlocks, and completion to screen readers.
- Full **keyboard navigation** in quizzes (arrow keys to move, Enter/Space to select) and **focus trapping** in modals.
- **`prefers-reduced-motion`** support that respectfully disables animation for those who need it.
- High-contrast, **WCAG-AA-tuned color tokens** and visible focus outlines.
- Mobile-first **responsive typography** and a collapsible sidebar that adapts gracefully to small screens.

### 11. Three Beautiful Themes

Switch between three hand-tuned, eye-friendly themes — each with a distinct personality and carefully balanced semantic colors:

- **📜 Paper** — A warm cream "light" mode that reads like an open book. Vivid teal accent with an indigo companion, airier paper tones, softer shadows.
- **🌙 Night** — A deep slate "dark" mode for late-night study. Luminous teal on a quiet background, with subject colors re-tuned to actually read well on dark surfaces.
- **✨ Twilight** — A bold new indigo-to-violet "twilight" mode. Deep indigo night with a gradient accent glow (violet-to-rose), perfect for creative or focused work.

Your choice persists across sessions and applies instantly via CSS variables. Each theme includes an ambient background wash tuned to its companion color, giving every theme its own emotional texture.

---

## Built Like Production Software

RealLearn isn't a demo held together with tape. Under the hood it's engineered with the kind of resilience, safety, and privacy you'd expect from a real product.

### Reliability Engineering

- **Streaming with keep-alive (SSE).** Long model calls are streamed over Server-Sent Events with periodic `ping` heartbeats, so connections never silently die mid-generation. The frontend has its own idle-timeout watchdog and automatically retries transient failures with exponential backoff.
- **Smart retries.** The Gemma client retries on `429` and `5xx` responses and transient network errors, with exponential backoff capped at a sensible ceiling.
- **A timeout circuit breaker.** If the model times out repeatedly, a circuit "opens" and fast-fails new requests for a cooldown window — protecting both the service and the user from piling onto a struggling upstream, then automatically recovering.
- **Concurrency control.** The backend caps simultaneous lesson generations and politely returns *"Server is busy, please retry"* rather than collapsing under load.
- **Rate limiting.** Per-user (or per-IP) request limits protect the service from abuse, with a sliding window and automatic cleanup.
- **Failure-streak alerting.** Consecutive generation failures are tracked and logged as alerts, and recovery is logged too — giving operators a clear health signal.
- **Graceful degradation.** If the live-news fetch fails, the lesson is still generated — just without the extra real-world grounding. Nothing is a single point of total failure.
- **Fail-fast startup.** The server validates required configuration on boot and refuses to start misconfigured, so problems surface immediately instead of mid-request.

### Safety & Content Moderation

RealLearn is built for learners **13 and older**, and safety is enforced at multiple layers:

- **Input filtering.** A content guard screens user questions against an extensive set of banned patterns (violence, exploitation, illegal activity, self-harm, and more) *before* anything reaches the model.
- **Output filtering.** Generated content is screened *again* on the way back, catching anything inappropriate that slips through.
- **In-prompt guardrails.** The system prompt itself instructs Gemma 4 to refuse harmful, illegal, or age-inappropriate requests and offer a constructive educational alternative instead.
- **Safety-finish handling.** If the model flags content via its own safety or recitation signals, RealLearn surfaces a clear, friendly message instead of broken output.
- **Moderation logging.** Blocked inputs and responses are recorded for accountability and continuous improvement.

### Security & Privacy

- **Authenticated by Clerk.** Every protected endpoint requires a verified Clerk session. Tokens are validated against trusted issuers using rotating JWKS keys, with an offline public-key fallback if the key endpoint is briefly unreachable — and a diagnostic endpoint to explain exactly *why* a token passes or fails.
- **Hardened HTTP.** Strict CORS allow-listing plus security headers — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a locked-down `Content-Security-Policy` in production.
- **You own your data.** Built-in, user-facing controls let you **export all your data** as JSON and **permanently delete your account** — wiping both your stored consent records *and* your Clerk account in one irreversible action.
- **Transparent consent.** Layered, versioned consent flows (pre-sign-in legal acceptance + cookie consent) are recorded with timestamps. Analytics load **only after** you opt in.
- **Honest about AI.** Clear, prominent disclaimers state that all content is AI-generated by Gemma 4, is not human-reviewed before display, may contain inaccuracies, and is not professional (medical/legal/financial) advice.
- **Full legal suite.** Dedicated, readable Privacy Policy, Terms of Service, and Cookie Policy pages — GDPR-minded, with stated data-retention and deletion practices.

---

## Real-World Outcomes

RealLearn was designed to fix concrete, everyday learning frustrations:

| The frustration | How RealLearn fixes it |
|---|---|
| *"I just need a quick answer."* | **⚡ Fast Mode** gives you one direct, focused answer in seconds. |
| *"I want to really understand this."* | **📚 Explain Mode** builds a three-part journey from foundation to real world. |
| *"I don't know where to start."* | **Part 1 (Foundation, Explain mode)** creates an accessible on-ramp for any topic. |
| *"I read it, but I don't really get it."* | **Quiz-gated progression** verifies comprehension before you move on. |
| *"This feels abstract and disconnected."* | **Part 3 (Explain mode)** ties the concept to real, current events. |
| *"It's either too basic or way over my head."* | **Level selection** tunes depth to exactly where you are. |
| *"English-only content shuts me out."* | **Native multilingual generation** in 8 languages opens the door. |
| *"I forget everything I learn."* | **Active recall + key takeaways + a saved library** make it stick. |

**The outcome:** clearer understanding, stronger retention, and a real bridge from concept to real-world thinking.

---

## The Technology

### Frontend — deployed on **Vercel**

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19
- **Language:** TypeScript
- **Auth:** Clerk (`@clerk/nextjs`)
- **State:** Zustand with `persist` middleware (localStorage-backed sessions)
- **Content rendering:** React Markdown + `remark-gfm`
- **Styling:** Tailwind CSS with a custom token-based design system (CSS-variable theming, fluid type, bespoke keyframe animations)

### Backend — deployed on **Render**

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express
- **Transport:** JSON + Server-Sent Events (SSE) streaming
- **AI:** Gemma 4 via the Gemini API
- **Real-world context:** Serper News API
- **Auth:** Clerk JWT verification via `jose` (remote JWKS + offline fallback)
- **Persistence:** MongoDB (consent records, moderation logs)
- **Reliability:** output validation, multi-stage JSON repair, retries, circuit breaker, concurrency limits, rate limiting, and timeout handling

---

## Architecture & Deployment

This repository is intentionally split into two independently deployable services:

```text
Real-learn/
├── frontend/   →  Next.js app   →  deploy on Vercel
└── backend/    →  Express API   →  deploy on Render
```

The frontend talks to the backend over a small, focused surface:

- `POST /api/generate-lesson` — generate a streamed lesson journey *(authenticated, rate-limited)*
- `POST /api/agreement` — record cookie/consent acceptance *(authenticated)*
- `POST /api/legal-consent` — record legal (Privacy + Terms) acceptance *(authenticated)*
- `GET  /api/export-data` — export all of a user's stored data as JSON *(authenticated)*
- `DELETE /api/account` — permanently delete a user's data and Clerk account *(authenticated)*
- `GET  /api/auth-debug` — diagnostic token inspection (no secrets leaked)
- `GET  /health` — operational health check

---

## API Behavior & SSE Streaming

`POST /api/generate-lesson` streams a sequence of events to the frontend:

| Event | Meaning |
|---|---|
| `ping` | Keep-alive heartbeat emitted periodically while generation runs |
| `lesson` | The final, fully-validated lesson payload (Fast: 1 part; Explain: 3 parts) |
| `done` | Successful end of stream |
| `error` | A human-readable failure message |

Request body includes `mode: "fast" | "explain"` to select the lesson type. This design keeps the user experience smooth across long-running model calls and avoids the dreaded silent connection timeout — paired with frontend idle-timeout detection and automatic retry with exponential backoff for transient errors. Fast mode adds minimal latency; Explain mode runs in parallel with news fetching for speed.

---

## Project Structure

```text
Real-learn/
├── frontend/                 # Next.js app (UI, state, client flow)
│   ├── app/                  # App Router pages (home, learn, legal, auth)
│   ├── components/           # homepage / learning / shared UI components
│   ├── hooks/                # useLesson (SSE streaming, mode-aware), useReadingTimer
│   ├── lib/                  # themes.ts (shared theme options + swatches)
│   ├── store/                # Zustand stores (lesson, saved journeys, preferences + mode)
│   ├── types/                # Shared TypeScript types (LessonMode, dynamic part counts)
│   └── middleware.ts         # Clerk route protection
├── backend/                  # Express API
│   └── src/
│       ├── server.js         # App, routes, SSE, rate limiting, security, mode handling
│       ├── validation.js     # Mode-aware journey normalization + schema validation
│       └── lib/
│           ├── gemma.js      # Gemma client, retries, circuit breaker, JSON repair, configurable max tokens
│           ├── prompts.js    # GENERATE_FAST_ANSWER_PROMPT (1 part) + GENERATE_LESSON_PROMPT (3 parts)
│           ├── serper.js     # Real-world news context fetch (Explain mode only)
│           ├── contentGuard.js  # Input/output content moderation
│           ├── auth.js       # Clerk JWT verification (jose)
│           ├── lessonCache.js   # Two-tier cache with mode-aware keys
│           └── mongodb.js    # MongoDB connection helper
└── README.md
```

---

## Environment Variables

### Frontend

- `NEXT_PUBLIC_BACKEND_URL=https://<your-render-backend>.onrender.com`
- `NEXT_PUBLIC_STREAM_IDLE_TIMEOUT_MS=120000` *(optional; frontend stream idle timeout in ms)*
- `NEXT_PUBLIC_GENERATE_RETRY_ATTEMPTS=2` *(optional; total frontend attempts for transient failures)*
- `NEXT_PUBLIC_GENERATE_RETRY_DELAY_MS=1500` *(optional; base retry backoff in ms)*
- Clerk publishable key and related Clerk env vars for authentication.

### Backend

- `GEMMA_API_KEY=...` *(required)*
- `GEMMA_MAX_RETRIES=2` *(optional; retries per model on 429/5xx/network errors)*
- `GEMMA_RETRY_DELAY_MS=700` *(optional; base backoff in ms)*
- `GEMMA_MAX_RETRY_DELAY_MS=5000` *(optional; cap for exponential backoff)*
- `GEMMA_TIMEOUT_CIRCUIT_FAILURE_THRESHOLD=5` *(optional; open the timeout circuit after N consecutive timeouts)*
- `GEMMA_TIMEOUT_CIRCUIT_COOLDOWN_MS=60000` *(optional; circuit-open cooldown in ms)*
- `LESSON_TIMEOUT_MS=300000` *(optional; max time for a single generation)*
- `SERPER_API_KEY=...` *(optional; enables real-world news grounding)*
- `MAX_CONCURRENT_LESSON_REQUESTS=3` *(optional; max in-flight generations)*
- `LESSON_FAILURE_ALERT_THRESHOLD=5` *(optional; alert every N consecutive failures)*
- `SSE_HEARTBEAT_INTERVAL_MS=15000` *(optional; SSE heartbeat interval, capped at 55000)*
- `RATE_LIMIT_WINDOW_MS=60000` and `RATE_LIMIT_MAX_REQUESTS=20` *(optional; rate-limit tuning)*
- `FRONTEND_ORIGIN=https://<your-vercel-frontend>.vercel.app` *(comma-separated allow-list for CORS)*
- `MONGODB_URI=...` and `MONGODB_DB=reallearn` *(consent + moderation storage)*
- `CLERK_SECRET_KEY=...`, `CLERK_FRONTEND_API=...`, `CLERK_JWKS_URL=...` *(Clerk auth verification & account deletion)*
- `PRIVACY_POLICY_VERSION=1.0`, `TERMS_OF_SERVICE_VERSION=1.0` *(optional; consent versioning)*
- `PORT=10000` *(optional on Render)*

---

## Local Development

Open two terminals.

**Terminal 1 — Backend**

```bash
cd backend
npm install
npm start
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

The frontend reads the backend base URL from `frontend/.env.local`.

---

## Validation Commands

From `frontend/`:

```bash
npm run lint
npm run build
```

---

## Roadmap

**Recently Shipped (Latest Release)**
- ✅ **Fast & Explain answer modes** — choose between a quick 1-part answer or a deep 3-part journey
- ✅ **Speed optimization** — Fast mode generates in 5–12 seconds by skipping news fetches and minimizing output
- ✅ **Refined themes** — enhanced Paper (light) and Night (dark) themes with softer palettes and richer shadows
- ✅ **New Twilight theme** — deep indigo with violet-to-rose accents for bold, focused study sessions

**Coming Soon**
- Richer analytics for learning outcomes (mode performance, engagement trends)
- Optional spaced repetition on key takeaways
- User accounts with long-term progress tracking across devices
- Classroom / teacher mode for collaborative learning
- Multilingual voice input and output (text-to-speech + speech-to-text)
- Browser extensions for inline question answering
- Collaborative study sessions and peer learning

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Please also read our [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

---

## Security

To report a security vulnerability, please see [SECURITY.md](./SECURITY.md). **Do not open public issues for security vulnerabilities.**

---

## Author

Built by **[alakmar344](https://github.com/alakmar344)** for the **Gemma 4 Good Hackathon** on Kaggle.

---

## License

This project is licensed under the **MIT License**.
See [LICENSE](./LICENSE) for the full text.

Copyright (c) 2026 alakmar344.

---

<p align="center"><strong>RealLearn — because the world is your textbook, and every question deserves a real lesson.</strong></p>
