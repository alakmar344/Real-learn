# RealLearn

### The World Is Your Textbook.

**RealLearn transforms a single question into an unforgettable learning journey — not a forgettable one-line answer, but a structured, progressive, quiz-verified lesson that meets you exactly where you are and takes you exactly where you need to go.**

Ask anything. In seconds, RealLearn engineers a complete educational experience — a three-stage progression from foundation to mechanism to real-world connection, checkpointed by comprehension gates you must pass before advancing. Every lesson is generated fresh by Google's Gemma 4, grounded in today's live news, delivered in your native language, and calibrated to your exact skill level. This is not search. This is not a chatbot. This is **teaching, reimagined for the AI era.**

---

## Product Preview

![RealLearn product preview](https://github.com/user-attachments/assets/835f71a3-ce53-415e-813f-00a2e57ecc51)

## See It Live

- **Live Product:** [https://reallearn.site/](https://reallearn.site/)
- **Demo Video:** [Watch the Demo](https://youtu.be/zehBGs-xBC0)
- **Info Page:** [See the Info Page](https://reallearn-info.vercel.app)
- **Kaggle Write-up (Gemma 4 Good Hackathon):** [Read the story behind it](https://www.kaggle.com/competitions/gemma-4-good-hackathon/writeups/new-writeup-1778215573161)

> The Kaggle write-up explains the project story, motivation, and the engineering decisions behind the architecture — built for the **Gemma 4 Good Hackathon**.

---

## What's Changed

A running log of what's new in RealLearn. The full, exhaustive history from the
gold redesign onward lives in [`change-made-after-submission.md`](./change-made-after-submission.md).

**Today — July 16, 2026**
- **Restored ReaLearn's scholarly gold identity.** The earlier "Apple-style liquid glass" pass had swapped the brand for generic iOS system-blue and a rainbow of system hues, which read as oversimplified and childish. Re-established a single, deliberate warm gold/amber accent across all three themes (Paper/Night/Twilight) and recolored the Navbar, completion screen, and celebration confetti to match — so the UI reads as *RealLearn* again.
- **Added material texture + identity-by-shape.** Kept the gold palette (colors were never the problem); the flat glass surfaces were. Surfaces now have real tactile texture (fine paper fiber + a soft organic mottle), and reusable identity primitives — an engraved double-border, a faint scholarly hairline weave, and a small consistent gold corner notch — carry the brand by *shape*, not just color.
- **UX polish — no more blue tap-flash; Fast mode is a "switch glider".** Removed the default translucent-blue tap highlight (it looked like a copy/selection) and replaced it with a calm on-brand press. The Fast/Explain toggle is now a gold pill that glides between options on a springy transform, so switching — especially to Fast — feels like a smooth physical switch.

**July 15, 2026**
- **Soothing ambient background.** New theme-aware "aurora" layer — three enormous, ultra-soft color washes drifting on 70–110s transform-only loops (GPU-cheap, no blur filters) — plus a softened crayon scene (lower opacity, gentler saturation, a vertical mask fade under the reading line) and halved paper grain. Easier on the eyes in all three themes; fully skipped on the low performance tier and frozen under reduced-motion.
- **Easter eggs.** Konami code → confetti storm; typing "magic" or "love" outside inputs → floating hearts; clicking the footer RealLearn wordmark 5× → a heart burst; and quiet once-per-day moments (night-owl / early-bird greetings, New Year, Teachers' Day, Children's Day).
- **Attachment features.** Time-aware personal greeting on the homepage (uses your first name if signed in), the hero quote is now a stable "quote of the day" ritual, and the footer counts "learning together for N days" with milestone celebrations at 7/30/100/365 days.
- **Legal v2.5 (Privacy) & v2.2 (Cookie) — reconsent.** The new locally-stored personalization data (first-visit date, once-per-day greeting markers, on-device first-name greeting) is now disclosed in the Privacy and Cookie Policies. Because the local-storage disclosures changed, all users are re-prompted to re-accept the Privacy Policy and the cookie banner asks again. Terms of Service unchanged (v2.3). No new server-side collection and no new third parties.

**July 13, 2026**
- **Loading cinematic overhaul.** Counter now auto-completes to 100% on an ease-out curve and fades out gracefully into the lesson, fixing the "stuck at 35%" disconnect on fast Cerebras responses. ([`...`])
- **Token-spend reduction (~50-60%).** Compressed system prompts, tightened output ceilings (fast 4000→2500, explain 6000→4000), enabled no-thinking mode on the primary Cerebras provider, and added per-request token logging to monitor daily burn. ([`...`])
- **AI provider switch → Cerebras primary, Cloudflare fallback.** The hedged multi-provider engine now uses **Cerebras Cloud** (Gemma 4 31B) as the primary inference provider, with **Cloudflare Workers AI** (Gemma) as an automatic fallback for reliability. ([`722f53e`](https://github.com/alakmar344/reallearn/commit/722f53e))
- **Ultra-fast inference knobs.** Added a "no-thinking" mode and OpenRouter host pinning to cut latency. ([`223de88`](https://github.com/alakmar344/reallearn/commit/223de88))
- **Cost-aware inference.** Trimmed wasted tokens, tightened output limits, and reduced latency. ([`92f34eb`](https://github.com/alakmar344/reallearn/commit/92f34eb))
- **Hedged multi-provider AI engine + security fixes.** ([`f048a34`](https://github.com/alakmar344/reallearn/commit/f048a34))
- **WCAG 2.1 AA compliance fixes** across the frontend. ([`7b11224`](https://github.com/alakmar344/reallearn/commit/7b11224))
- **Crayon scene expanded** (school, river bridge, RealLearn signpost), made visible, and made responsive (portrait mobile SVG + scroll-stable positioning). ([`11218d5`](https://github.com/alakmar344/reallearn/commit/11218d5), [`090d66e`](https://github.com/alakmar344/reallearn/commit/090d66e), [`c285e2d`](https://github.com/alakmar344/reallearn/commit/c285e2d))
- **GPU-composited static SVG** background replacing the heavy inline SVG. ([`d6e8318`](https://github.com/alakmar344/reallearn/commit/d6e8318))
- **Legal v2.2** — Privacy Policy & Terms of Service updated to document the new providers and to re-prompt all users for re-consent. ([`748e220`](https://github.com/alakmar344/reallearn/commit/748e220))

**Tomorrow (planned / upcoming)**
- Continue tuning the primary/fallback hedge timing and cost knobs.
- Further accessibility and crayon-scene polish based on user feedback.
- (This section is updated continuously as new commits land — see
  [`change-made-after-submission.md`](./change-made-after-submission.md).)

---

## Table of Contents

- [What's Changed](#whats-changed)

- [The Problem We're Solving](#the-problem-were-solving)
- [The RealLearn Promise](#the-reallearn-promise)
- [How It Works — Your Journey, Step by Step](#how-it-works--your-journey-step-by-step)
- [Powered by Gemma 4](#powered-by-gemma-4)
- [The Feature Tour](#the-feature-tour)
  - [1. The Three-Part Learning Journey](#1-the-three-part-learning-journey)
  - [2. Quiz-Gated Progression](#2-quiz-gated-progression)
  - [3. Learn in Your Language](#3-learn-in-your-language)
  - [4. Adaptive Difficulty](#4-adaptive-difficulty)
  - [5. Grounded in Today's Real World](#5-grounded-in-todays-real-world)
  - [6. A Cinematic, Calm Experience](#6-a-cinematic-calm-experience)
  - [7. Your Personal Learning Library](#7-your-personal-learning-library)
  - [8. The Follow-Up Loop](#8-the-follow-up-loop)
  - [9. Designed for Everyone — Accessibility First](#9-designed-for-everyone--accessibility-first)
  - [10. Three Beautiful Themes](#10-three-beautiful-themes)
  - [11. Voice-Powered Learning](#11-voice-powered-learning)
  - [12. Gamification & Achievement System](#12-gamification--achievement-system)
  - [13. Shareable Result Cards](#13-shareable-result-cards)
  - [14. Dual Answer Modes — Fast & Explain](#14-dual-answer-modes--fast--explain)
- [Built Like Production Software](#built-like-production-software)
  - [Reliability Engineering](#reliability-engineering)
  - [Two-Tier Lesson Caching](#two-tier-lesson-caching)
  - [Safety & Content Moderation](#safety--content-moderation)
  - [Security & Privacy](#security--privacy)
- [Real-World Outcomes](#real-world-outcomes)
- [The Technology](#the-technology)
- [Architecture & Deployment](#architecture--deployment)
- [API Behavior & SSE Streaming](#api-behavior--sse-streaming)
- [Deep Dive: Every File, Every Module](#deep-dive-every-file-every-module)
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
| **AI lesson generation** | Powered by Google's **Gemma 4**, served via **Cerebras Cloud** (primary) with **Cloudflare Workers AI** fallback — every lesson is generated fresh for your exact question. |
| **Learning design** | A deliberate three-stage progression — Foundation -> Mechanism -> Real World. |
| **Active recall** | Quiz gates after every part. You can't skip ahead until you've understood. |
| **Real-world grounding** | Live news context is woven into Part 3, so theory meets today. |

The outcome is an experience that feels less like *querying a database* and more like *being taught by a patient, knowledgeable tutor* who always knows what's happening in the world.

---

## How It Works — Your Journey, Step by Step

1. **Ask.** Type any question on the homepage — *"How do black holes work?"*, *"Why did inflation rise in 2024?"*, *"What is photosynthesis?"* — or tap the microphone and ask with your voice.
2. **Personalize.** Choose your **language** (12 options), your **level** (Class 6-8, Class 9-10, or College / Advanced), and your **mode** (Fast for instant answers, Explain for deep journeys).
3. **Watch it build.** A cinematic loading experience plays while RealLearn works. Behind the scenes, the backend fetches **fresh real-world news context**, then prompts **Gemma 4** to compose your lesson — streamed back live over a keep-alive connection so it never silently times out.
4. **Learn Part 1 — Foundation.** A beginner-friendly framing of the core idea, in clean Markdown, with real source links, a subject badge, and a built-in reading timer.
5. **Prove it.** A two-question quiz slides up. Get a **perfect score** to unlock the next part. Every answer comes with an *exhaustive, mini-lesson explanation*. Options are reshuffled on retake so you can't memorize positions.
6. **Unlock Part 2 — Mechanism.** A satisfying unlock animation flashes, and the deeper "how and why" layer opens up.
7. **Unlock Part 3 — Real World Now.** The final part connects the concept to **current events** — with real names, dates, and numbers pulled from live news.
8. **Complete.** A celebratory completion screen shows your score with animated confetti, your three key takeaways, and a shareable result card.
9. **Keep going.** Ask a **follow-up question** to spin up a brand-new journey instantly — or revisit any past lesson from your saved library.

Everything you do is **persisted automatically**, so you can close the tab and pick up exactly where you left off.

---

## Powered by Gemma 4

RealLearn runs on **Gemma 4** — and we didn't just call the model and hope for the best. We engineered a sophisticated prompting and reliability layer around it to guarantee educational quality and structural consistency on every single request.

**Inference providers.** Generation is served by a hedged, multi-provider engine. Our **primary** provider is **Cerebras Cloud** (running **Gemma 4 31B**, `gemma-4-31b`), chosen for its very low time-to-first-token. If Cerebras is briefly slow or unavailable, the request automatically **falls back** to **Cloudflare Workers AI** (Gemma, `@cf/google/gemma-4-26b-a4b-it`), so lessons are generated reliably even during provider hiccups. The same "no training on your data" guarantee applies to both.

### Key Technical Highlights

- **Structured Output Enforcement.** A carefully engineered system prompt forces Gemma 4 to return a strict JSON schema with *exactly* three progressive parts, each carrying rich educational content and *precisely two* multiple-choice questions (four options each). Quiz explanations are deliberately required to be **exhaustive teaching** — a complete mini-lesson hidden inside every answer.

- **Native Multilingual Generation.** Lessons are generated *directly* in the learner's chosen language — English, Hindi, Gujarati, Tamil, Bengali, Marathi, Telugu, Kannada, Malayalam, Punjabi, Urdu, or Odia — never machine-translated afterward. This preserves cultural nuance, natural tone, and authenticity. (JSON keys stay in English so the app stays robust.)

- **Adaptive Difficulty Calibration.** The prompt dynamically adjusts depth, vocabulary, and complexity based on the selected level — simple language and basic examples for Class 6-8, moderate technical depth for Class 9-10, and high-rigor terminology for College / Advanced.

- **Real-World Grounding via Serper.** *Before* calling Gemma, the backend fetches recent, India-relevant news using the **Serper API** and injects it straight into the prompt. This means **Part 3** connects theory to actual current events — with real names, dates, and figures — instead of vague abstractions.

- **Dual Prompt Architecture.** Two distinct, tightly compressed system prompts power two distinct experiences: `GENERATE_LESSON_PROMPT` for the full 3-part Explain journey, and `GENERATE_FAST_ANSWER_PROMPT` for the lightning-fast single-part mode. Prompts describe the JSON schema concisely instead of embedding a massive template, cutting ~300-400 tokens per request without sacrificing answer depth.

- **Robustness Engineering.** Model output is never trusted blindly:
  - A multi-stage **JSON repair pipeline** strips "thinking" tokens, removes Markdown code fences, closes truncated output, drops trailing commas, re-attempts parsing through several escalating recovery strategies, and even salvages partial lessons when the model runs out of output budget.
  - **Strict schema validation** runs before anything is streamed to your screen — wrong shape, wrong part count, or malformed quizzes are rejected automatically. But validation is *lenient by design*: 1-2 quiz questions per part are accepted (not just exactly 2), and missing key takeaways are backfilled from part titles. A truncated-but-coherent lesson degrades gracefully instead of failing.
  - **Clear, human error messages** appear when the model is briefly unavailable after retries, so you're never left staring at a broken screen.

This architecture keeps average generation time at a brisk **2–5 seconds**
while maintaining high structural integrity and educational value. Gemma 4's
strong reasoning, combined with our deliberate prompting and reliability layer,
is what lets RealLearn deliver coherent, progressive, context-aware journeys
instead of generic one-shot answers.

---

## The Feature Tour

### 1. The Three-Part Learning Journey

Every lesson, every time, has **exactly three parts** — a structure designed by cognitive-science principles to prevent overload and build durable understanding:

- **Part 1 — Foundation:** The accessible entry point. Beginner-friendly framing that gives you a place to stand.
- **Part 2 — Mechanism:** The deeper layer. The logic, the "how" and the "why," with worked examples.
- **Part 3 — Real World Now:** The payoff. Where the concept lives in today's world, grounded in current events.

Each part arrives with **real source links** (so you can verify and go deeper) and a **subject badge** auto-classified across 11 disciplines — Physics, Chemistry, Economics, Biology, CS, History, Geography, Mathematics, Political Science, Environmental Science, or General — each color-coded in a muted academic palette.

### 2. Quiz-Gated Progression

This is the heart of *active learning*. After each part:

- **2 questions**, **4 options** each.
- A built-in **reading timer** gently encourages you to actually read before the quiz opens.
- You must score **100%** to unlock the next part — no skipping, no skimming.
- Every answer reveals a **deep, exhaustive explanation**: the historical context, the underlying theory, *why* the right answer is right, and *why each wrong option is wrong*.
- Wrong answers shake; correct answers pulse. Feedback is immediate and tactile.
- On failed attempts, **options are reshuffled** using a Fisher-Yates shuffle that guarantees the correct answer moves to a new position — so you have to genuinely re-find it, not just remember "it was B."

The quiz isn't a test that judges you — it's a **comprehension gate that protects your understanding** before you move on.

### 3. Learn in Your Language

RealLearn meets learners where they are, generating full lessons natively in:

> **English · Hindi · Gujarati · Tamil · Bengali · Marathi · Telugu · Kannada · Malayalam · Punjabi · Urdu · Odia**

This dramatically lowers the access barrier for millions of students for whom English-only content is a wall, not a window. The Serper news fetch also adapts — it searches for news in the learner's chosen language using proper BCP-47 language codes.

### 4. Adaptive Difficulty

One topic, three depths. Pick the level that fits you and the entire lesson — vocabulary, examples, and rigor — adapts:

- **Class 6-8** — simple, friendly, concrete.
- **Class 9-10** — balanced technical depth.
- **College / Advanced** — full rigor and precise terminology.

### 5. Grounded in Today's Real World

When you ask about a concept, RealLearn quietly searches recent news in the background and threads what's happening *right now* into your final lesson part. Economics ties to this quarter's headlines; physics ties to the latest discovery; history ties to current parallels. **Theory stops feeling theoretical.**

The Serper integration includes its own in-memory cache (10-minute TTL, 200 entries) so repeated questions skip the network round-trip entirely. If the news fetch fails, the lesson is still generated — just without the real-world grounding. Nothing is a single point of total failure.

### 6. A Cinematic, Calm Experience

RealLearn is designed to feel like a quiet, beautiful study space — not a noisy app:

- A **cinematic loading screen** with a glowing radial backdrop, a progress bar that auto-completes to 100% on an ease-out curve and fades gracefully into the lesson, a six-step checklist (Understanding your question -> Researching real-world context -> Writing the foundation -> Explaining how it works -> Connecting it to the real world -> Crafting quiz questions), and rotating learning-fact cards keeps you company while your lesson builds.
- A **progress rail** shows your three-part journey as connected nodes that fill from locked -> active -> complete.
- A full-screen **unlock animation** rewards every part you clear.
- A **completion screen** celebrates the finish with an animated score ring, falling confetti, key takeaways, and a shareable result card.
- **Toast notifications** quietly confirm milestones — *"Lesson ready!"*, *"Journey complete!"*
- Typography is intentional and editorial: **Playfair Display** for headlines, **Inter** for the interface, **Lora** for reading content, and **JetBrains Mono** for code — a book-like, scholarly aesthetic throughout.

### 7. Your Personal Learning Library

Every journey you complete is **automatically saved** to a sidebar library. Reopen any past lesson to review or retake it. Journeys are intelligently de-duplicated by a stable signature (your question + first part title), so revisiting a topic updates the entry instead of cluttering your history. You're always in control — remove individual journeys or clear them all.

### 8. The Follow-Up Loop

Curiosity doesn't stop at one question. When you finish a journey, a **Follow-Up box** invites you to go deeper. Ask a new question and a fresh three-part journey spins up instantly — no trip back to the homepage required. Learning becomes a continuous flow, not a series of dead ends.

### 9. Designed for Everyone — Accessibility First

Accessibility isn't an afterthought here — it's wired into the foundation, targeting **WCAG 2.1 Level AA**:

- A **skip-to-content** link for keyboard users.
- **ARIA live regions** that announce loading, unlocks, and completion to screen readers.
- Full **keyboard navigation** in quizzes (arrow keys to move, Enter/Space to select) and **focus trapping** in modals.
- **`prefers-reduced-motion`** support that respectfully disables animation for those who need it.
- High-contrast, **WCAG-AA-tuned color tokens** and visible focus outlines.
- Mobile-first **responsive typography** and a collapsible sidebar that adapts gracefully to small screens.
- **44px minimum touch targets** on all interactive elements.

### 10. Three Beautiful Themes

Switch between three hand-tuned, warm, eye-friendly themes:

- **Paper** — a warm cream/gold "light" mode that reads like an open book.
- **Night** — a deep ink "dark" mode warmed by a scholarly gold accent for late-night study.
- **Twilight** — a warm amber-dusk mode over deep violet for those who want personality.

Your choice persists across sessions and applies instantly via CSS variables, with carefully balanced semantic colors (correct/incorrect, accents, subject hues) tuned separately for each theme. The theme system is defined in a single source of truth (`lib/themes.ts`) consumed by every theme picker in the app.

### 11. Voice-Powered Learning

RealLearn speaks your language — literally:

- **Voice Input (Mic Button):** Ask questions by speaking. The Web Speech API (`SpeechRecognition`) captures your voice, transcribes it in real-time with interim results, and feeds it directly into the question input. Supports all 12 app languages with proper BCP-47 speech codes (`en-IN`, `hi-IN`, `gu-IN`, `ta-IN`, `bn-IN`, `mr-IN`, `te-IN`, `kn-IN`, `ml-IN`, `pa-IN`, `ur-IN`, `or-IN`). Gracefully degrades — the button is disabled with a helpful tooltip in unsupported browsers.

- **Read Aloud (Listen Button):** Every lesson part has a "Listen" button that reads the content aloud using the Web Speech API (`speechSynthesis`). The system intelligently selects the best available voice — scoring by language match, provider quality (Google neural, Microsoft natural, Apple enhanced), and voice type (premium, wavenet, journey). Text is chunked into sentence-aligned segments with Devanagari danda support, played at a slightly slower rate with a subtle pitch lift for a more human, natural sound. Markdown syntax is stripped to clean prose before speaking.

### 12. Gamification & Achievement System

RealLearn transforms learning into a rewarding habit with a comprehensive engagement system:

- **XP & Levels:** Every quiz passed earns XP (5 base + 5 per correct answer). Completing a full journey earns bonus XP (10 base + 15 for perfect). Streak bonuses add up to 15 extra XP. A gently rising curve (100, 175, 250, 325... XP per level) keeps early wins fast while making higher levels feel earned. Level titles progress from *Curious* to *Explorer*, *Apprentice*, *Thinker*, *Polymath*, *Scholar*, and *Sage*.

- **Daily Streaks:** Maintain a learning streak by hitting your daily goal. Streak freezes (you start with 2) protect you when life gets in the way. The streak system uses local calendar dates, not 24-hour windows — so it aligns with your actual day.

- **Daily Goals:** Set a daily target (1, 3, 5, or 8 parts per day). A beautiful circular progress ring in the navbar shows your real-time progress. Hit your goal and the flame ignites.

- **17 Achievements:** From "First Steps" (complete your first journey) to "Unstoppable" (30-day streak), "Renaissance Mind" (explore 5 subjects), "Night Owl" (learn after midnight), and "Early Bird" (learn before 8am). Each badge has a tier (bronze, silver, gold, legendary), a progress bar showing how close you are, and an animated unlock celebration.

- **Activity Heatmap:** A GitHub-style contribution grid shows your learning activity over the last 14 weeks, with intensity-coded cells.

- **Celebration System:** A FIFO queue of celebration events (XP pop-ups, level-up modals with confetti bursts, badge unlocks, streak flames, daily-goal completions) renders through the `EngagementLayer` component, with each celebration type having its own duration, animation, and visual style.

### 13. Shareable Result Cards

When you complete a journey, a Canvas-generated result card lets you share your achievement:

- A rich **1080x1920 PNG card** with a purple-to-teal gradient background, subtle grid texture, glowing orbs, the RealLearn brand, your question, your score in a progress arc, your level and streak stats, and a prominent CTA.
- **Native Web Share API** support — on mobile, the card is shared directly as an image file with a text summary. On unsupported browsers, the card downloads as a PNG.
- **Copy to clipboard** — a quick text summary for sharing on any platform.

### 14. Dual Answer Modes — Fast & Explain

RealLearn offers two distinct ways to learn:

- **Fast Mode:** One instant, direct answer — like asking a brilliant teacher who gets straight to the point. The fast prompt suppresses thinking tokens, uses a lower temperature (0.2) for focused output, and is capped at 2,500 output tokens to keep responses lean. Skips the Serper news fetch and LLM input moderation to shave latency. A short answer, two quick quiz questions, two key takeaways. Done.

- **Explain Mode:** The classic deep 3-part journey with Foundation, Mechanism, and Real World. Full news grounding, full moderation, full educational depth, capped at 4,000 output tokens. The experience RealLearn was built for.

Toggle between modes with a single tap on the homepage. Your preference persists across sessions.

---

## Built Like Production Software

RealLearn isn't a demo held together with tape. Under the hood it's engineered with the kind of resilience, safety, and privacy you'd expect from a real product.

### Reliability Engineering

- **Streaming with keep-alive (SSE).** Long model calls are streamed over Server-Sent Events with periodic `ping` heartbeats (configurable, default 15s, capped at 55s), so connections never silently die mid-generation. The frontend has its own idle-timeout watchdog (default 120s) and automatically retries transient failures with exponential backoff (default 2 attempts, 1.5s base delay, 8s cap).

- **Smart retries.** The Gemma client retries on `429`, `403` (Cloudflare rate limiting), and `5xx` responses and transient network errors, with exponential backoff (default 700ms base, 5s cap, 2 retries).

- **A timeout circuit breaker.** If the model times out repeatedly (default 5 consecutive), a circuit "opens" and fast-fails new requests for a cooldown window (default 60s) — protecting both the service and the user from piling onto a struggling upstream, then automatically recovering.

- **Concurrency control.** The backend caps simultaneous lesson generations (default 3) and politely returns *"Server is busy, please retry"* with a `Retry-After` header rather than collapsing under load.

- **Rate limiting.** Per-user (hashed full-token SHA-256 keys) or per-IP request limits (default 20 requests per 60-second sliding window) protect the service from abuse, with automatic cleanup of expired entries.

- **Failure-streak alerting.** Consecutive generation failures are tracked and logged as alerts (default threshold: 5), and recovery is logged too — giving operators a clear health signal.

- **Graceful degradation.** If the live-news fetch fails, the lesson is still generated — just without the extra real-world grounding. If LLM moderation times out, it fails open rather than blocking a valid lesson. Nothing is a single point of total failure.

- **Fail-fast startup.** The server validates required configuration on boot (`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`) and refuses to start misconfigured, so problems surface immediately instead of mid-request.

### Two-Tier Lesson Caching

RealLearn employs a sophisticated two-tier caching architecture that makes repeat questions instant:

- **Tier 1 — In-Memory LRU:** An insertion-ordered Map acts as an LRU cache (default 200 entries, 6-hour TTL). Sub-millisecond hits on the same instance. Reads re-insert for recency; writes evict the oldest entry.

- **Tier 2 — MongoDB with TTL Index:** Survives restarts and is shared across instances, so any server in the fleet benefits from any other's work. A TTL index automatically expires stale entries.

A cached lesson was already moderated (regex + LLM) and schema-validated the first time it was generated, so a cache hit legitimately skips Serper, the Gemma generation call, AND both moderation passes — turning a ~20-60s pipeline into a single lookup. Cache keys are deterministic SHA-256 hashes of (normalized question + language + level + mode), so trivially different phrasings of the same question still hit the cache.

### Safety & Content Moderation

RealLearn is built for learners **13 and older**, and safety is enforced at multiple layers:

- **Regex Input Filtering.** A comprehensive content guard screens user questions against an extensive set of banned patterns (child exploitation, sexual violence, weapons/explosives/drugs manufacturing instructions, violence against persons, self-harm/suicide, hate speech, cybercrime/fraud, trafficking) *before* anything reaches the model. The patterns are carefully designed to target *genuinely harmful intent* — not the mere mention of sensitive topics. Educational and historical subjects (World War, atomic bombings, terrorism as a topic, the Holocaust) remain answerable.

- **LLM-Powered Moderation.** A secondary moderation layer runs the same Gemma model as a content classifier with its own dedicated system prompt, a strict 8-second timeout, a 15-minute in-memory verdict cache (500 entries), and a "fail open" design — if the moderation call times out or errors, the content passes through rather than blocking the user.

- **Output Filtering.** Generated content is screened *again* on the way back, catching anything inappropriate that slips through.

- **In-Prompt Guardrails.** The system prompt itself instructs Gemma 4 to refuse harmful, illegal, or age-inappropriate requests and offer a constructive educational alternative instead.

- **Safety-Finish Handling.** If the model flags content via its own safety or recitation signals, RealLearn surfaces a clear, friendly message instead of broken output.

- **Moderation Logging.** Blocked inputs and responses are recorded in MongoDB for accountability and continuous improvement.

### Security & Privacy

- **Authenticated by Clerk.** Every protected endpoint requires a verified Clerk session. Tokens are validated against trusted issuers using rotating JWKS keys (`jose` library), with an offline public-key PEM fallback if the JWKS endpoint is briefly unreachable — and a diagnostic endpoint (`/api/auth-debug`, production-gated behind `AUTH_DEBUG_ENABLED`) to explain exactly *why* a token passes or fails. Production trusts only the configured issuer, an explicit `CLERK_ADDITIONAL_ISSUERS` allowlist, and `*.reallearn.site` — wildcard dev domains are rejected in production to prevent cross-tenant token abuse.

- **IDOR Elimination.** All consent writes are keyed by the verified token identity (`req.auth.userId`), never by client-supplied IDs. Any authenticated user can only modify their own records.

- **Hardened HTTP.** Strict CORS allow-listing (no `null`/`undefined` origins) plus security headers — `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation, interest-cohort all denied), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `X-XSS-Protection: 0`, and a locked-down `Content-Security-Policy` + `Strict-Transport-Security` with preload in production. `X-Powered-By` is disabled.

- **Input Validation.** Questions are capped at 1,000 characters. Language and level fields are validated against exact allowlists matching the UI options — preventing prompt injection through these fields. JSON body size is limited to 100KB.

- **You own your data.** Built-in, user-facing controls let you **export all your data** as JSON (backend consent records + all local storage data) and **permanently delete your account** — wiping both your stored consent records AND your Clerk account in one irreversible action.

- **Transparent consent.** Layered, versioned consent flows (pre-sign-in legal acceptance + cookie consent) are recorded with timestamps, device IP, user agent, and policy version numbers. Analytics load **only after** you opt in.

- **Honest about AI.** Clear, prominent disclaimers state that all content is AI-generated by Gemma 4, is not human-reviewed before display, may contain inaccuracies, and is not professional (medical/legal/financial) advice.

- **Full legal suite.** Dedicated, readable Privacy Policy, Terms of Service, and Cookie Policy pages — GDPR-minded, with stated data-retention and deletion practices. Versioned consent (currently v1.2) with automatic re-accept prompts when policies change.

---

## Real-World Outcomes

RealLearn was designed to fix concrete, everyday learning frustrations:

| The frustration | How RealLearn fixes it |
|---|---|
| *"I don't know where to start."* | **Part 1 (Foundation)** creates an accessible on-ramp for any topic. |
| *"I read it, but I don't really get it."* | **Quiz-gated progression** verifies comprehension before you move on. |
| *"This feels abstract and disconnected."* | **Part 3** ties the concept to real, current events. |
| *"It's either too basic or way over my head."* | **Level selection** tunes depth to exactly where you are. |
| *"English-only content shuts me out."* | **Native multilingual generation** in 12 languages opens the door. |
| *"I forget everything I learn."* | **Active recall + key takeaways + a saved library** make it stick. |
| *"I don't have time for a long lesson."* | **Fast mode** gives you a direct answer in seconds. |
| *"I want to track my progress."* | **XP, levels, streaks, badges, and a heatmap** keep you motivated. |

**The outcome:** clearer understanding, stronger retention, and a real bridge from concept to real-world thinking.

---

## The Technology

### Frontend — deployed on **Vercel**

| Layer | Technology | Purpose |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Server-side rendering, routing, middleware |
| UI | **React 19** | Component architecture, hooks, concurrent features |
| Language | **TypeScript** | End-to-end type safety |
| Auth | **Clerk** (`@clerk/nextjs`) | Authentication, user management, route protection |
| State | **Zustand** (5 stores) with `persist` middleware | Lesson state, preferences, progress/gamification, saved journeys — all localStorage-backed |
| Content | **React Markdown** + `remark-gfm` | Rich Markdown rendering of lesson content |
| Styling | **Tailwind CSS** + custom CSS variables | Token-based design system, fluid type, bespoke keyframe animations |
| Speech | **Web Speech API** | Voice input (SpeechRecognition) and read-aloud (speechSynthesis) |
| Sharing | **Canvas API** + Web Share API | Generate and share 1080x1920 result cards |

### Backend — deployed on **Render**

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | **Node.js** (ES Modules) | Modern JavaScript runtime |
| Framework | **Express** | HTTP server, middleware, routing |
| Transport | **JSON** + **Server-Sent Events** (SSE) streaming | Keep-alive lesson delivery |
| AI | **Gemma 4** — **Cerebras Cloud** (primary, `gemma-4-31b`) with **Cloudflare Workers AI** fallback | Lesson generation, content moderation |
| News | **Serper API** | Real-world news context for Part 3 |
| Auth | **Clerk JWT** verification via `jose` | Remote JWKS + offline PEM fallback |
| Persistence | **MongoDB** | Consent records, moderation logs, lesson cache |
| Reliability | Custom-built | Output validation, multi-stage JSON repair, retries, circuit breaker, concurrency limits, rate limiting, two-tier caching, timeout handling |

---

## Architecture & Deployment

This repository is intentionally split into two independently deployable services:

```text
Real-learn/
├── frontend/   ->  Next.js app   ->  deploy on Vercel
└── backend/    ->  Express API   ->  deploy on Render
```

The frontend talks to the backend over a small, focused surface:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/generate-lesson` | POST | Generate a streamed lesson journey *(authenticated, rate-limited)* |
| `/api/agreement` | POST | Record cookie/consent acceptance *(authenticated)* |
| `/api/legal-consent` | POST | Record legal (Privacy + Terms) acceptance *(authenticated)* |
| `/api/legal-consent/status` | GET | Check current legal consent status *(authenticated)* |
| `/api/export-data` | GET | Export all of a user's stored data as JSON *(authenticated)* |
| `/api/account` | DELETE | Permanently delete a user's data and Clerk account *(authenticated)* |
| `/api/auth-debug` | GET | Diagnostic token inspection — production-gated *(rate-limited)* |
| `/health` | GET | Operational health check |

---

## API Behavior & SSE Streaming

`POST /api/generate-lesson` streams a sequence of events to the frontend:

| Event | Meaning |
|---|---|
| `ping` | Keep-alive heartbeat emitted periodically while generation runs |
| `lesson` | The final, fully-validated lesson payload |
| `done` | Successful end of stream |
| `error` | A human-readable failure message |

This design keeps the user experience smooth across long-running model calls and avoids the dreaded silent connection timeout — paired with frontend idle-timeout detection and automatic retry with exponential backoff for transient errors.

---

## Deep Dive: Every File, Every Module

This section documents every file in the repository and what it does — so you can navigate the codebase with confidence.

### Backend (`backend/`)

| File | What It Does |
|---|---|
| `package.json` | Backend manifest. ES Modules, Express + Cloudflare + jose + MongoDB deps. `npm start` boots the server. |
| `.env.example` | Template for every environment variable with descriptions. Copy to `.env` and fill in your keys. |
| `src/server.js` | **The heart of the backend.** Express app with CORS, security headers, JSON body parsing (100KB limit), rate limiting (sliding window, per-user hashed token keys), SSE streaming with heartbeat pings, concurrency gates, failure-streak tracking, and all 8 API endpoints. Validates startup config on boot. |
| `src/validation.js` | Journey normalization and schema validation. `normalizeJourney()` salvages partial output — filters malformed quiz questions, drops unusable parts, backfills missing key takeaways. `isValidJourney()` accepts 1-N parts (up to mode max) with 1-2 quiz questions each. Mode-aware: "explain" expects 3 parts, "fast" expects 1. |
| `src/lib/gemma.js` | **Gemma 4 client.** Direct `fetch` to Cloudflare Workers AI (OpenAI-compatible endpoint). Handles retries on 429/403/5xx/network errors with exponential backoff, timeout circuit breaker (opens after N consecutive timeouts, auto-recovers after cooldown), thinking-tag stripping, and a **7-stage JSON repair pipeline** (strip thinking blocks -> remove markdown fences -> extract JSON structure -> strip trailing commas -> close truncated brackets -> chop to last complete bracket -> retry with comma fix). |
| `src/lib/prompts.js` | Two system prompts: `GENERATE_LESSON_PROMPT` (3-part Explain mode with voice/tone guidance, safety rules, structured JSON schema) and `GENERATE_FAST_ANSWER_PROMPT` (1-part Fast mode with "do not think out loud" instruction, shorter output budget). Both enforce strict JSON output schemas. |
| `src/lib/serper.js` | Real-world news fetcher. Calls Serper's news endpoint with language-aware search (BCP-47 codes for all 12 app languages), 6-second timeout, 10-minute in-memory cache (200 entries). Returns formatted context with titles, dates, snippets, and source URLs. Gracefully degrades on failure. |
| `src/lib/auth.js` | Clerk JWT verification. Remote JWKS (rotating keys) as primary, offline PEM public key as fallback. Issuer trust: configured Frontend API, explicit allowlist, `*.reallearn.site` — wildcard dev domains only in non-production. `extractBearerToken()`, `inspectToken()` (diagnostic), `requireAuth()` middleware. |
| `src/lib/contentGuard.js` | Regex-based content safety filter. Targets genuinely harmful *intent* (CSAM, weapons manufacturing, violence instructions, self-harm methods, hate speech generation, cybercrime tutorials) while preserving educational content about sensitive topics. Separate patterns for user input and AI output. |
| `src/lib/moderation.js` | LLM-powered content classifier. Runs Gemma as a safety judge with a dedicated prompt, 8-second timeout, temperature 0 for deterministic output, 15-minute verdict cache (500 entries). **Fails open** — a moderation timeout allows content through rather than blocking the user. |
| `src/lib/lessonCache.js` | Two-tier lesson cache. Tier 1: in-memory LRU (200 entries). Tier 2: MongoDB with TTL index (6-hour default). Deterministic cache keys (SHA-256 of normalized question + language + level + mode). Fire-and-forget writes. Cache hits bypass Serper, Gemma, and both moderation passes. |
| `src/lib/mongodb.js` | MongoDB connection helper. Singleton client with lazy connection. Reads `MONGODB_URI` (or `MONGODB_URL`) and `MONGODB_DB` from environment. |

### Frontend (`frontend/`)

#### App Pages (`app/`)

| File | What It Does |
|---|---|
| `layout.tsx` | Root layout. Wraps everything in `ClerkProvider`, `ThemeApplier`, `AppShell`, `ToastContainer`, `CookieConsent`, `PreSignInConsent`, and `SkipToContent`. Sets page metadata. |
| `page.tsx` | **Homepage.** The landing experience — rotating educational quotes, "The World Is Your Textbook" hero, `QuestionInput` form, `HomeStats` (daily spark topic, resume-in-progress card, streak/level link), `Footer`. Syncs legal consent to backend on sign-in. |
| `globals.css` | **The design system.** CSS custom properties for 3 themes (Paper, Night, Twilight) built around a deliberate warm gold/amber brand accent; typography scale, spacing scale, shadows, subject colors, semantic colors. Material-texture layers (paper fiber + organic mottle) and reusable identity primitives (`.engraved` double-border, `.identity-texture` scholarly hairline weave, `.identity-corner` gold notch, `.rule-gold` divider). 15+ keyframe animations (fadeUp, accentFlash, unlockPop, shake, correctPulse, confettiFall, flameFlicker, xpPopIn, badgePop, levelBurst, ringSweep, sheen). Markdown content styles. App shell layout (sidebar + main). `prefers-reduced-motion` support. |
| `learn/page.tsx` | **The learning experience.** Orchestrates the full journey: `ProgressRail`, `PartCard` for each part, `QuizSheet` modal, `CompletionScreen`, `FollowUpBox`, `UnlockAnimation`. Persists journeys to localStorage on every progress change. Records XP, streaks, daily goals, and badges via `progressStore`. |
| `progress/page.tsx` | **Progress dashboard.** Level hero with XP bar, streak flame with freeze count, daily goal ring with target selector, lifetime stats grid (journeys, quizzes, perfect runs, languages, subjects, follow-ups), GitHub-style activity heatmap, achievements grid with progress bars. |
| `settings/page.tsx` | **Settings page.** Theme picker, answer mode toggle (Fast/Explain), language selector, level selector, Clerk `UserButton`, data export (JSON download combining backend + local storage), permanent account deletion with confirmation modal. |
| `legal/page.tsx` | Legal hub with tabbed navigation between Privacy Policy, Terms of Service, and Cookie Policy. |
| `sign-in/[[...sign-in]]/page.tsx` | Clerk sign-in page (catch-all route). |
| `sign-up/[[...sign-up]]/page.tsx` | Clerk sign-up page (catch-all route). |

#### Components (`components/`)

**Homepage (`components/homepage/`)**

| File | What It Does |
|---|---|
| `QuestionInput.tsx` | The question form. Auto-resizing textarea (Lora font, 1000-char max), Fast/Explain mode toggle (pill-style radio group), mic button for voice input, "Try:" rotating example questions, conditional submit (auth-gated with Clerk `SignInButton` fallback). |
| `HomeStats.tsx` | Homepage stats strip. Daily spark topic (20 curated topics, rotated by day-of-year), resume-in-progress card (loads saved journey directly), streak/level link to `/progress`. |
| `ExampleQuestions.tsx` | Rotating example question hint. 5 questions, 3-second cycle, `fadeUp` animation on change. |

**Learning (`components/learning/`)**

| File | What It Does |
|---|---|
| `PartCard.tsx` | Lesson part card. Shows PART badge, subject color tag, listen button, Playfair title, Lora Markdown content (`ReactMarkdown` + `remark-gfm`), source links, reading timer progress bar, quiz trigger button. Locked state: frosted-glass overlay with lock icon. Collapsed state: green completed bar. |
| `QuizSheet.tsx` | Bottom-sheet quiz modal. Focus trapping, Escape-to-close, drag handle, reshuffled questions on retake (Fisher-Yates shuffle), dynamic total derived from actual questions (not hardcoded), "Answers reshuffled" hint, `QuizQuestion` for each, perfect-score gate to unlock next part. |
| `QuizQuestion.tsx` | Individual quiz question. 4-lettered options (A/B/C/D) with radio-group semantics, keyboard navigation (arrow keys, Enter/Space), shake animation on wrong, pulse on correct, explanation box with left-border accent. Full ARIA labels. |
| `CompletionScreen.tsx` | Journey completion. Animated confetti (40 particles), SVG score ring with percentage, "Journey Complete" / "Quick Answer Mastered" title, key takeaways list, `ShareResult` component, retake/restart buttons. Screen reader announcement. |
| `ProgressRail.tsx` | Three-node progress indicator. Connected by lines that fill green on completion. Fast mode shows a single badge instead of a rail. Lock/active/complete states with appropriate icons and animations. |
| `FollowUpBox.tsx` | Post-completion follow-up form. Textarea with mic button, "Teach Me More" submit, loading state. |
| `UnlockAnimation.tsx` | Full-screen accent flash overlay. 800ms `accentFlash` animation on part unlock. |
| `ShareResult.tsx` | Canvas-based result card generator. 1080x1920 PNG with purple-to-teal gradient, grid texture, glowing orbs, brand header, question box, stats pills, score arc, CTA band. Web Share API with file support, fallback to download. Copy-to-clipboard text summary. |

**Shared (`components/shared/`)**

| File | What It Does |
|---|---|
| `AppShell.tsx` | App shell. Sidebar + main content layout. Hides sidebar on auth routes. Shows `PreferenceModal` on first sign-in. `EngagementLayer` overlay. |
| `Sidebar.tsx` | Collapsible sidebar. RealLearn brand, "New lesson" button, saved journeys list (upsert, remove with confirmation), theme modal trigger, settings link. Mobile: overlay with backdrop. |
| `Navbar.tsx` | Sticky glass-effect navbar. RealLearn logo + brand, `ProgressHub` (streak/level/daily-goal widget). Responsive padding for sidebar toggle. |
| `LoadingCinematic.tsx` | Full-screen loading experience. Glowing radial backdrop, question quote, asymptotic progress bar (approaches 95%), 6-step checklist with pulse-dot active state, 7 rotating learning facts, cancel button. |
| `ErrorState.tsx` | Error screen. Warning emoji, message, Try Again + Go Home buttons. |
| `Footer.tsx` | Footer. Logo, copyright, AI disclaimer, Privacy/Terms/Legal/Support links. |
| `EngagementLayer.tsx` | Celebration renderer. FIFO queue of XP chips (float-up), level-up modals (confetti burst), badge unlocks (tier-colored border, glow), streak flames (flicker animation), daily-goal completions. Auto-dismiss timers per type. |
| `AchievementsGrid.tsx` | Badge grid. All 17 achievements with emoji, title, tier color border, progress bar (locked) or checkmark (earned). |
| `ActivityHeatmap.tsx` | GitHub-style contribution grid. 14 weeks of intensity-coded cells. "Less/More" legend. |
| `DailyGoalRing.tsx` | SVG circular progress ring. Configurable size/stroke, accent-to-correct color transition on goal met. |
| `ProgressHub.tsx` | Navbar widget. Streak flame (flicker animation), level ring (SVG progress arc), daily goal counter. Navigates to `/progress`. |
| `CookieConsent.tsx` | Cookie consent banner. Shows after sign-in if no stored consent. Accept/Decline buttons. Saves to localStorage + backend (with device IP from ipify.org). |
| `PreSignInConsent.tsx` | Legal consent modal. Pre-sign-in gate requiring Privacy + Terms acceptance. Version-aware — prompts re-acceptance when policies update. Decline blocks access (with path exceptions for legal/sign-in). Backend sync on accept. |
| `ConfirmModal.tsx` | Reusable confirmation dialog. Keyboard shortcuts (Escape/Enter), destructive styling option. |
| `ThemeModal.tsx` | Theme picker modal. Three themes with swatch circles, labels, hints. |
| `PreferenceModal.tsx` | First-run preference modal. Theme, language, level selectors. Saves to localStorage. |
| `ThemeApplier.tsx` | Theme applicator. Sets `data-theme` attribute on `<html>` element. |
| `ToastContainer.tsx` | Toast notification system. Global `showToast()` function, success/error/info types, auto-dismiss (3.2s), bottom-right positioning. |
| `SkipToContent.tsx` | Accessibility skip link. Hidden until focused, then appears as a prominent button. |
| `LiveRegion.tsx` | Screen reader live region. Hidden `aria-live="polite"` div for dynamic announcements. |
| `GoogleAnalytics.tsx` | Consent-gated Google Analytics loader. Only loads GA script after cookie consent. Listens for `cookie-consent-accepted` event. |
| `LanguageSelector.tsx` | Language dropdown. 12 languages with custom chevron styling. |
| `LevelSelector.tsx` | Level dropdown. 3 levels with custom chevron styling. |
| `ListenButton.tsx` | Text-to-speech button. Reads lesson content aloud via Web Speech API. Shows stop/speaking state. Disabled with tooltip in unsupported browsers. |
| `MicButton.tsx` | Voice input button. SVG microphone icon, red recording state with pulse ring, disabled state for unsupported browsers. |
| `SourceTag.tsx` | Source link tag. Bordered pill with link icon and truncated URL. |

#### Hooks (`hooks/`)

| File | What It Does |
|---|---|
| `useLesson.ts` | **The lesson generation hook.** Manages the full lifecycle: sends POST to `/api/generate-lesson`, parses SSE stream (event/data blocks), handles ping/lesson/done/error events, idle timeout detection (default 120s), automatic retry with exponential backoff (default 2 attempts, 1.5s base, 8s cap), retryable error classification (status codes, network errors, timeout messages). |
| `useReadingTimer.ts` | Reading timer hook. Tracks elapsed time against a configurable duration (default 10s). Returns `isComplete`, `remainingMs`, `progress` (0-100). Updates every 100ms. |
| `useSpeech.ts` | Speech utilities. `useTextToSpeech` — reads text aloud with voice scoring (Google neural, Microsoft natural, Apple enhanced preferred), sentence chunking, rate/pitch tuning. `useSpeechRecognition` — voice input with interim results, language-aware, toggle start/stop. `markdownToPlainText` — strips markdown for clean TTS. |
| `useMounted.ts` | Hydration guard. Returns `true` only after client-side mount. Gates localStorage-dependent rendering to prevent hydration mismatches. |

#### Stores (`store/`)

| File | What It Does |
|---|---|
| `lessonStore.ts` | Lesson state. Question, lesson data, loading/error states, unlocked part, completed parts, part scores, collapsed parts, completion/follow-up flags. Persisted to `reallearn-journey` in localStorage. Actions: `setQuestion`, `startLoading`, `setLesson`, `setError`, `passPart`, `togglePartCollapse`, `resetForNextQuestion`, `resetAll`, `resetProgress`, `loadJourney`. |
| `preferenceStore.ts` | User preferences. Theme, language, level, mode. Persisted to `reallearn-preferences` in localStorage. Reads existing preferences on init for seamless migration. |
| `progressStore.ts` | **Gamification engine.** XP, streaks, daily goals, lifetime stats, activity history, badges, celebration queue. Persisted to `reallearn-progress` in localStorage (celebrations excluded). Derives level-ups and badge unlocks on every state transition. Streak resolution with freeze support. |
| `savedJourneysStore.ts` | Saved lessons library. Journey list with upsert-by-id semantics. Persisted to `reallearn-saved-journeys` in localStorage. |

#### Library (`lib/`)

| File | What It Does |
|---|---|
| `achievements.ts` | **Pure gamification logic.** XP math (`xpToNextLevel`, `levelInfo`, `xpForPart`, `xpForLessonComplete`, `xpForStreak`), level titles (Curious -> Sage), streak date logic (`dayKey`, `daysBetween`, `resolveStreak` with freeze support), 17 achievement definitions with unlock predicates and progress functions, tier colors. |
| `quizShuffle.ts` | Quiz option shuffler. Fisher-Yates shuffle of index arrays. `reshuffleQuestion` guarantees the correct answer moves to a new position (swaps with neighbor if shuffle leaves it in place). Preserves `correctIndex` synchronization. |
| `themes.ts` | Theme definitions. Single source of truth for theme pickers. Three themes (Paper, Night, Twilight) with value, label, hint, swatch color, and accent color. |

#### Scripts (`scripts/`)

| File | What It Does |
|---|---|
| `verify-quiz-shuffle.mjs` | Verification script. Runs 50,000 reshuffle rounds across representative questions (including 2-option edge case). Confirms `correctIndex` always points to the real answer text, options are never lost/duplicated/changed, and the correct answer always moves to a new position. Run with `npm run verify:quiz`. |

#### Types (`types/`)

| File | What It Does |
|---|---|
| `index.ts` | Shared TypeScript types. `Language` (8 values), `Level` (3 values), `LessonMode` (fast/explain), `Subject` (11 values), `QuizQuestion`, `LessonPart`, `LessonJourney`, `Theme` (light/dark/twilight), `SavedJourney`. |

#### Configuration Files

| File | What It Does |
|---|---|
| `package.json` | Frontend manifest. Next.js 15, React 19, Clerk, Zustand, React Markdown, Tailwind CSS. Scripts: `dev`, `build`, `start`, `lint`, `verify:quiz`. |
| `next.config.js` | Next.js config. React strict mode, Clerk image domain, security headers (HSTS, CSP, X-Frame-Options, etc.), Permissions-Policy with microphone=(self) for voice input. |
| `tailwind.config.js` | Tailwind config. Custom color palette (background, surface, card, accent, text hierarchy, subject colors), font families (Inter, Playfair Display, JetBrains Mono), border radius scale, 12 custom animations with keyframes. |
| `tsconfig.json` | TypeScript config. Strict mode, ES2017 target, bundler module resolution, path alias `@/*`. |
| `.eslintrc.json` | ESLint config. Next.js core web vitals + TypeScript rules. |
| `middleware.ts` | Clerk route protection. Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks`, `/legal`. Auth routes redirect signed-in users to home. Protected routes redirect to sign-in. |

### Root Files

| File | What It Does |
|---|---|
| `README.md` | This file. Comprehensive documentation of the entire platform. |
| `CONTRIBUTING.md` | Contribution guidelines. Bug reports, feature suggestions, code submissions, PR guidelines. |
| `CODE_OF_CONDUCT.md` | Contributor Covenant Code of Conduct v2.0. |
| `SECURITY.md` | Security policy. Vulnerability reporting, response timeline, security measures overview. |
| `DESIGN_AUDIT.md` | Detailed design audit report. UI/UX analysis, accessibility findings, responsive design assessment, design system review, priority recommendations. |
| `IMPROVEMENT_PRIORITIES.md` | Sprint-based improvement roadmap. 6 sprints covering critical fixes, responsive design, design system refactoring, UX enhancements, performance, documentation. |
| `errors.md` | Engineering debugging log. Documents the AI provider migration saga (Gemini -> Vertex AI -> Cloudflare Workers AI), every bug found and fixed, security hardening session, and lessons learned. |
| `LICENSE` | MIT License. Copyright (c) 2026 alakmar344. |
| `opencode.json` | OpenCode configuration (MCP, schema). |
| `.gitignore` | Git ignore rules for node_modules, .next, env files, build output, logs. |

---

## Environment Variables

### Frontend

- `NEXT_PUBLIC_BACKEND_URL=https://<your-render-backend>.onrender.com`
- `NEXT_PUBLIC_STREAM_IDLE_TIMEOUT_MS=120000` *(optional; frontend stream idle timeout in ms)*
- `NEXT_PUBLIC_GENERATE_RETRY_ATTEMPTS=2` *(optional; total frontend attempts for transient failures)*
- `NEXT_PUBLIC_GENERATE_RETRY_DELAY_MS=1500` *(optional; base retry backoff in ms)*
- Clerk publishable key and related Clerk env vars for authentication.

### Backend

- `CLOUDFLARE_API_TOKEN=...` + `CLOUDFLARE_ACCOUNT_ID=...` *(Cloudflare Workers AI. Create a token with the "Workers AI" permission in the Cloudflare dashboard)*
- `GEMMA_MODEL=@cf/google/gemma-4-26b-a4b-it` *(optional; Workers AI model ID)*
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
- `MONGODB_URI=...` and `MONGODB_DB=reallearn` *(consent + moderation storage + lesson cache)*
- `CLERK_SECRET_KEY=...`, `CLERK_FRONTEND_API=...`, `CLERK_JWKS_URL=...` *(Clerk auth verification & account deletion)*
- `CLERK_ADDITIONAL_ISSUERS=...` *(optional; extra trusted Clerk token issuers, comma-separated)*
- `AUTH_DEBUG_ENABLED=false` *(optional; enable /api/auth-debug in production)*
- `PRIVACY_POLICY_VERSION=1.2`, `TERMS_OF_SERVICE_VERSION=1.2` *(optional; consent versioning)*
- `LESSON_CACHE_ENABLED=true` *(optional; disable lesson caching)*
- `LESSON_CACHE_TTL_MS=21600000` *(optional; cache TTL in ms, default 6 hours)*
- `LESSON_CACHE_MAX_MEMORY_ENTRIES=200` *(optional; in-memory LRU cache size)*
- `MODERATION_ENABLED=true` *(optional; disable LLM moderation)*
- `MODERATION_TIMEOUT_MS=8000` *(optional; moderation call timeout)*
- `MODERATION_CACHE_TTL_MS=900000` *(optional; moderation verdict cache TTL, default 15 min)*
- `PORT=10000` *(optional on Render)*
- `AI_DISABLE_THINKING=cerebras` *(optional; disable "thinking" tokens on the primary Cerebras provider to cut token spend by ~30-50%. Set to `off`, `cerebras`, `cloudflare`, or `both`.)*

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
npm run verify:quiz
```

---

## Roadmap

- Richer analytics for learning outcomes
- Optional spaced repetition on key takeaways
- User accounts with long-term progress tracking
- Classroom / teacher mode
- Multilingual voice input and output

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
