# RealLearn — Built by a 13-Year-Old from Mandsaur, MP

**Al-Aqmar Tinwala | Age 13 | Mandsaur, Madhya Pradesh, India**

---

## The Project

RealLearn is a full-stack AI-powered adaptive learning platform that generates personalized lessons from any question, with quiz checkpoints, gamification, voice features, and multi-provider AI failover.

---

## The Numbers

| Metric | Value |
|---|---|
| Total Commits | **586** |
| Calendar Days | **75** (May 6 — July 20, 2026) |
| Active Coding Days | **35** |
| Silent Days | **40** |
| Merged Pull Requests | **185** |
| Lines Changed (total) | **89,125** |
| Lines Inserted | **63,764** |
| Lines Deleted | **25,361** |
| Net Lines of Code | **38,403** |
| Unique Files Touched | **193** |
| Files in Production | **121** |

---

## The Velocity

| Metric | Value |
|---|---|
| Commits per Active Day | **16.7** |
| Lines Changed per Active Day | **2,546** |
| Lines Added per Active Day | **1,822** |
| Peak Single Day | **58 commits** (May 7 — one every 25 minutes) |
| Days with 10+ Commits | **22 out of 35** (63%) |
| Average PR Size | **485 lines changed** |

---

## The Night Owl Factor

| Metric | Value |
|---|---|
| Commits 10PM–6AM (school nights) | **112** |
| Weekend Commits (Sat+Sun) | **170** |
| Friday Night through Sunday Night | **236** |
| Commits on Sundays | **42** |
| Peak Hour | **9AM IST** (first-period class time) |
| Second Peak | **3PM IST** (right after school) |

---

## 5 AI Backend Migrations

```
Google Gemma → Vertex AI → Groq → Cloudflare Workers AI → Cerebras
```

Each migration required rewriting the entire inference layer. Most professional teams do one migration per year. This was done in under 2 months.

---

## 7 Design Iterations

```
Dark Gold-Noir → Classic Textbook → Teal-Ink → Pastel Crayon
→ Crayon Painting Scene → Apple Liquid Glass → Scholarly Gold
→ Editorial Ink & Cobalt → Japanese-Inspired
```

One complete visual overhaul every 5 active days.

---

## What Was Built

- **AI Lesson Generation** — Ask any question, get a personalized lesson with quizzes
- **Progressive Unlock** — Lessons unlock sequentially as you learn
- **Gamification** — XP, streaks, badges, daily goals, shareable result cards
- **Voice Features** — Listen-to-answer TTS + speech-to-text input
- **12 Indian Languages** — Hindi, Marathi, Tamil, Bengali, and more
- **Real-Time Streaming** — SSE (Server-Sent Events) for live lesson generation
- **Multi-Provider Failover** — Circuit breakers, retry logic, load balancing
- **Chat Persistence** — IndexedDB archival, localStorage backup
- **Clerk Authentication** — JWT verification with JWKS fallback
- **MongoDB Backend** — Rate limiting, moderation logging, consent records
- **Cookie Consent** — DB-backed for signed-in users
- **Privacy Compliance** — COPPA, CCPA, DPDP (India's data protection law)
- **Legal Documents** — Privacy Policy v2.7, Terms v2.5, Cookie Policy v2.3
- **Shareable Cards** — Gen Z portrait-style result cards
- **Feedback System** — Anonymous post-lesson feedback with reconsent
- **Background Art** — Crayon paintings of schools, rivers, bridges

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, React |
| Backend | Express.js, Node.js |
| AI Primary | Cerebras (gemma-4-31b) |
| AI Fallback | Cloudflare Workers AI |
| Auth | Clerk |
| Database | MongoDB |
| Client Storage | IndexedDB |
| Voice | edge-tts, Web Speech API |
| Deployment | Vercel (frontend), Render (backend) |
| Files | 56 TSX, 19 TS, 16 JS |

---

## Infrastructure (That Most CS Students Learn in Year 3)

- Circuit breakers for AI failover
- SSE streaming with keep-alive
- Multi-provider load balancing
- Rate limiting with tiered protection
- CSP (Content Security Policy) headers
- JWKS fallback for auth tokens
- Brotli compression
- GPU-composited SVG backgrounds
- IndexedDB client-side archival
- Per-user concurrency limits
- IP anonymization
- Fail-closed output moderation

---

## The Context

- **Mandsaur, MP** — Tier-3 city, population ~300,000
- **Not Bangalore. Not Delhi. Not Silicon Valley.**
- Built with **GitHub Copilot + Google Jules AI agents**
- **112 commits pushed between 10PM and 6AM** on school nights
- **Peak commit hour: 9AM IST** — during class
- **170 weekend commits** — every weekend was a 48-hour hackathon
- **58 commits on May 7 alone** — more than 90% of GitHub repos get in their entire lifetime
- **89,125 lines changed in 35 active days** — YC-startup MVP velocity

---

## The Comparison

- A professional dev team of 5–10 produces 10–20 commits/day. This was **16.7/day, solo**.
- The median open-source project gets ~1.5 commits/day. RealLearn averaged **11x that**.
- On May 7, 58 commits landed — more than most hackathon teams produce in 48 hours of team coding.
- Most CS students encounter circuit breakers, SSE, and multi-provider failover in their third year of college. A 13-year-old built them from scratch.

---

## The Bottom Line

> 586 commits. 89,125 lines. 185 PRs. 193 files.
> Built by a 13-year-old from Mandsaur, Madhya Pradesh,
> in 35 active days, using GitHub Copilot and Google Jules.
>
> Most people at 13 were playing Minecraft.
> Al-Aqmar Tinwala built an AI learning platform with
> multi-provider failover, GDPR compliance, and
> Japanese-inspired design.

---

*RealLearn — Because where you're from doesn't determine what you can build.*
