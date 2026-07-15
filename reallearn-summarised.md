# RealLearn — Complete Documentation Summary

> **Purpose:** This document provides a full, detailed summary of every documentation file in the RealLearn repository. It is intended as a single-reference guide for judges, reviewers, contributors, and anyone seeking to understand the full scope of the project.

---

## Table of Contents

1. [README.md — The Master Documentation](#1-readmemd--the-master-documentation)
2. [change-made-after-submission.md — Post-Submission Changelog](#2-change-made-after-submissionmd--post-submission-changelog)
3. [DESIGN_AUDIT.md — Design Audit Report](#3-design_auditmd--design-audit-report)
4. [IMPROVEMENT_PRIORITIES.md — Sprint-Based Improvement Roadmap](#4-improvement_prioritiesmd--sprint-based-improvement-roadmap)
5. [errors.md — AI Provider Migration & Debugging Log](#5-errorsmd--ai-provider-migration--debugging-log)
6. [CONTRIBUTING.md — Contribution Guidelines](#6-contributingmd--contribution-guidelines)
7. [CODE_OF_CONDUCT.md — Community Code of Conduct](#7-code_of_conductmd--community-code-of-conduct)
8. [SECURITY.md — Security Policy](#8-securitymd--security-policy)
9. [LICENSE — MIT License](#9-license--mit-license)
10. [Cross-Document Themes & Insights](#10-cross-document-themes--insights)

---

## 1. README.md — The Master Documentation

**File:** `README.md` (733 lines)
**Purpose:** The comprehensive, single-source-of-truth documentation for the entire RealLearn platform. Covers everything from product vision to architecture to every file in the codebase.

### What RealLearn Is

RealLearn is an AI-powered learning platform that transforms a single question into a structured, three-part educational journey. It is **not** a chatbot or search engine — it is a teaching system that generates complete lessons with progressive difficulty, quiz-gated comprehension checks, and real-world grounding in current events.

**Tagline:** "The World Is Your Textbook."

### The Problem It Solves

Traditional Q&A (search engines, AI chatbots) produces answers that are:
- Too shallow to truly understand
- Too advanced (or too basic) for the learner's actual level
- Disconnected from the real world
- Instantly forgettable because the learner never engaged with the content

RealLearn rebuilds the learning journey automatically — Foundation → Mechanism → Real World — checkpointed by quizzes that verify comprehension before advancement.

### How It Works (User Journey)

1. **Ask** — Type or speak any question
2. **Personalize** — Choose language (12 Indian languages), level (Class 6-8, 9-10, College/Advanced), and mode (Fast or Explain)
3. **Watch it build** — Cinematic loading screen with progress indicators while the backend fetches news context and generates the lesson via Gemma 4
4. **Learn Part 1 (Foundation)** — Beginner-friendly framing with source links, subject badge, reading timer
5. **Prove it** — Two-question quiz with 100% pass requirement; exhaustive explanations for every answer; options reshuffled on retake
6. **Unlock Part 2 (Mechanism)** — Deeper "how and why" layer
7. **Unlock Part 3 (Real World Now)** — Connects concept to current events with real names, dates, numbers
8. **Complete** — Celebratory screen with confetti, score ring, key takeaways, shareable result card
9. **Keep going** — Follow-up questions spin up new journeys instantly

### Powered by Gemma 4

- **Primary provider:** Cerebras Cloud (Gemma 4 31B, `gemma-4-31b`) — chosen for very low time-to-first-token
- **Fallback provider:** Cloudflare Workers AI (Gemma, `@cf/google/gemma-4-26b-a4b-it`) — automatic failover
- **Structured output enforcement** — System prompt forces strict JSON schema with exactly three parts, each with two quiz questions
- **Native multilingual generation** — 12 languages, never machine-translated
- **Adaptive difficulty** — Vocabulary, examples, and rigor adjust to selected level
- **Real-world grounding** — Serper API fetches recent news before calling Gemma
- **Dual prompt architecture** — Separate prompts for Fast (1-part) and Explain (3-part) modes
- **Robustness engineering** — Multi-stage JSON repair pipeline, strict schema validation, partial lesson salvage

### Feature Tour

1. **Three-Part Learning Journey** — Foundation, Mechanism, Real World; subject-classified across 11 disciplines
2. **Quiz-Gated Progression** — 100% pass requirement, Fisher-Yates reshuffle, exhaustive explanations
3. **12 Indian Languages** — English, Hindi, Gujarati, Tamil, Bengali, Marathi, Telugu, Kannada, Malayalam, Punjabi, Urdu, Odia
4. **Adaptive Difficulty** — Three levels with distinct vocabulary and rigor
5. **Real-World Grounding** — Live news woven into Part 3 via Serper API
6. **Cinematic Loading** — Glowing radial backdrop, progress bar, 6-step checklist, rotating learning facts
7. **Personal Learning Library** — Auto-saved journeys, de-duplicated by stable signature
8. **Follow-Up Loop** — Ask deeper questions without returning to homepage
9. **WCAG 2.1 AA Accessibility** — Skip-to-content, ARIA live regions, keyboard navigation, focus trapping, reduced-motion support, 44px touch targets
10. **Three Themes** — Paper (warm cream), Night (teal-on-slate), Twilight (deep indigo)
11. **Voice Learning** — Web Speech API for input (12 languages) and read-aloud with intelligent voice selection
12. **Gamification** — XP, levels, daily streaks, streak freezes, 17 achievements, activity heatmap
13. **Shareable Result Cards** — Canvas-generated 1080x1920 PNG with Web Share API
14. **Dual Answer Modes** — Fast (instant, 1-part) and Explain (deep, 3-part)

### Built Like Production Software

**Reliability:**
- SSE streaming with keep-alive heartbeats
- Smart retries with exponential backoff
- Timeout circuit breaker
- Concurrency control
- Per-user rate limiting
- Failure-streak alerting
- Graceful degradation

**Two-Tier Lesson Caching:**
- Tier 1: In-memory LRU (200 entries, 6-hour TTL)
- Tier 2: MongoDB with TTL index
- Deterministic SHA-256 cache keys

**Safety & Content Moderation:**
- Regex input filtering (targets harmful intent, not topic mention)
- LLM-powered moderation (fail-open design)
- Output filtering
- In-prompt guardrails
- Safety-finish handling
- Moderation logging

**Security & Privacy:**
- Clerk JWT verification with JWKS + offline PEM fallback
- IDOR elimination
- Hardened HTTP (CORS, security headers, CSP, HSTS)
- Input validation (1000-char question cap, language/level allowlists, 100KB body limit)
- User data ownership (export + permanent deletion)
- Transparent consent with versioned re-acceptance
- Honest AI disclaimers
- Full legal suite (Privacy Policy, Terms of Service, Cookie Policy)

### Technology Stack

**Frontend (Vercel):** Next.js 15, React 19, TypeScript, Clerk, Zustand, React Markdown, Tailwind CSS, Web Speech API, Canvas API

**Backend (Render):** Node.js, Express, JSON + SSE, Gemma 4 (Cerebras primary, Cloudflare fallback), Serper API, Clerk JWT, MongoDB

### Architecture

```
Real-learn/
├── frontend/   →  Next.js app   →  deploy on Vercel
└── backend/    →  Express API   →  deploy on Render
```

**API Endpoints:**
- `POST /api/generate-lesson` — Generate a streamed lesson (authenticated, rate-limited)
- `POST /api/agreement` — Record cookie/consent acceptance
- `POST /api/legal-consent` — Record legal acceptance
- `GET /api/legal-consent/status` — Check consent status
- `GET /api/export-data` — Export user data as JSON
- `DELETE /api/account` — Permanently delete user data and Clerk account
- `GET /api/auth-debug` — Diagnostic token inspection (production-gated)
- `GET /health` — Operational health check

### Deep Dive: Every File, Every Module

The README contains an exhaustive table documenting every file in both `backend/` and `frontend/` directories, including:
- **Backend:** `server.js`, `validation.js`, `gemma.js`, `prompts.js`, `serper.js`, `auth.js`, `contentGuard.js`, `moderation.js`, `lessonCache.js`, `mongodb.js`
- **Frontend Pages:** `layout.tsx`, `page.tsx`, `globals.css`, `learn/page.tsx`, `progress/page.tsx`, `settings/page.tsx`, `legal/page.tsx`, sign-in/sign-up pages
- **Components:** 30+ components across homepage, learning, and shared categories
- **Hooks:** `useLesson`, `useReadingTimer`, `useSpeech`, `useMounted`
- **Stores:** `lessonStore`, `preferenceStore`, `progressStore`, `savedJourneysStore`
- **Lib:** `achievements.ts`, `quizShuffle.ts`, `themes.ts`
- **Configuration:** `package.json`, `next.config.js`, `tailwind.config.js`, `tsconfig.json`, `.eslintrc.json`, `middleware.ts`

### Environment Variables

Comprehensive list of 30+ environment variables for both frontend and backend, covering:
- Cloudflare Workers AI credentials
- Gemma model configuration
- Retry and timeout tuning
- Serper API key
- Concurrency and rate limiting
- MongoDB connection
- Clerk authentication
- Legal version constants
- Cache configuration
- Moderation settings
- AI thinking mode control

### Local Development

Two-terminal setup: backend on `npm start`, frontend on `npm run dev`.

### Validation Commands

```bash
npm run lint
npm run build
npm run verify:quiz
```

### Roadmap

- Richer analytics for learning outcomes
- Optional spaced repetition on key takeaways
- User accounts with long-term progress tracking
- Classroom / teacher mode
- Multilingual voice input and output

---

## 2. change-made-after-submission.md — Post-Submission Changelog

**File:** `change-made-after-submission.md` (546 lines)
**Purpose:** A living changelog documenting every notable change made to RealLearn from the "gold redesign" (commit `e55b098`, 2026-06-20) to the current HEAD (2026-07-14). This file exists to show judges and reviewers the massive iteration that happened after the initial hackathon submission.

### Scope & Significance

This changelog covers **290+ commits** over approximately 3 weeks, representing a fundamental transformation of the product. The initial submission was a basic version; this document records everything that was built, broken, fixed, and refined since then.

### Major Sections

#### The Pivot Out of "Gold" (Starting Point)
- Commit `e55b098` — Redesigned from dark gold-noir aesthetic to classic printed-textbook look
- Replaced gold CSS custom properties with neutral "accent" names
- Updated every learning/homepage/shared component

#### Authentication, Identity & Account Controls (12 commits)
- Clerk authentication implementation
- Cookie consent with MongoDB persistence
- localStorage chat persistence
- Sidebar, theme modal, account deletion
- Settings page with account controls

#### Legal, Consent, Compliance & Privacy (25+ commits)
- Legal compliance framework
- Rate limiting and security headers
- Versioned legal docs (Privacy Policy, Terms of Service, Cookie Policy)
- Consent-gated Google Analytics
- COPPA/CCPA/DPDP compliance
- IP anonymization
- Reconsent flows for policy updates
- Current version: Privacy Policy v2.5, ToS v2.3, Cookie Policy v2.2

#### Security Hardening (30+ commits)
- WCAG 2.1 AA compliance fixes
- XSS prevention
- Focus trapping
- CSP hardening
- XP farming prevention
- Rate-limit bypass fixes
- TTS SSML injection prevention
- Email spoofing prevention
- 21 frontend bugs fixed in one session
- Backend crash fixes

#### AI Provider Stack — A Long Migration Chain (30+ commits)
The most dramatic section. The AI provider was migrated through multiple vendors:
1. Google Gemini API (blocked by Google's IP-level restrictions on Render)
2. Vertex AI (auth issues, Model Garden access)
3. Groq (doesn't host Gemma)
4. Cloudflare Workers AI (successful — hosts Gemma 4 weights)
5. Multiple SDK approaches (raw fetch → Google SDK → Cloudflare SDK → direct fetch)
6. Final state: Cerebras Cloud primary, Cloudflare Workers AI fallback

#### Performance, Latency & Robustness (25+ commits)
- Lesson generation speedups
- Engaging loading screen
- Quiz option reshuffling on retake
- Auto-save lessons with progress tracking
- Explain-mode optimizations
- SSE progress events
- Model warm-up
- Self-healing generation retries
- Cold-start latency reduction (109s → 50s)
- Algorithmic quality gate

#### Design, Theming & Visual Identity (20+ commits)
- Teal-ink palette refresh
- Voice input/output (TTS/STT)
- Gen Z UI refresh
- Share card redesigns
- Preference system unification
- Engagement system (XP, streaks, badges, goals)
- Pastel crayon palette
- Crayon painting background (river, house, library, school, bridge, signpost)
- GPU-composited static SVG background
- Responsive crayon background
- Ambient aurora layer (drifting theme-aware color washes) + softened crayon scene and paper grain
- WCAG 2.1 AA compliance

#### Voice, TTS & STT (4 commits)
- Backend edge-tts replacing browser Web Speech TTS
- TTS loading hang and CORS fixes
- CSP blob media fixes

#### Gamification, Engagement & Sharing (10+ commits)
- Streaks, XP, achievements, notifications
- Quiz option reshuffling
- Themed UI modals
- Engagement system with shareable results
- Easter eggs (Konami code, secret words, footer wordmark, once-per-day seasonal moments)
- Attachment features (time-aware personal greeting, quote-of-the-day ritual, "learning together for N days" counter)
- Legal policy updates for gamification

#### Latest Changes (July 15, 2026)
- **Soothing ambient background** — Aurora layer, softened crayon scene, halved paper grain; skipped on low-perf devices
- **Easter eggs & attachment features** — Konami code, secret words, personal greetings, day counter, daily quote ritual
- **Legal v2.5 / Cookie v2.2 with reconsent** — New locally-stored personalization data disclosed; all users re-prompted

#### July 14, 2026 Changes
- **Expanded language support from 8 to 12** — Added Malayalam, Punjabi, Urdu, Odia
- **Storage split to IndexedDB** — All lesson bodies moved to IndexedDB for privacy and performance
- **Cost fix** — Archived lessons no longer regenerate (no repeat LLM spend)
- **Bug fixes** — Cloudflare fallback actually works, stable User-Agent hash salt
- **IP anonymization** — Consent records no longer store raw IPs
- **Output moderation fails closed** — Security improvement
- **Performance fix** — Tiered lesson-history retention + debounced store persistence
- **Adaptive visual-performance tiers** — Auto-detects device capability

### Chronological Summary Table

A complete table of 290 commits from 2026-06-20 to 2026-07-14, with dates, commit hashes, and summaries.

---

## 3. DESIGN_AUDIT.md — Design Audit Report

**File:** `DESIGN_AUDIT.md` (442 lines)
**Purpose:** A comprehensive design audit analyzing RealLearn across UI/UX, design system, accessibility, code organization, and information architecture.

### Overall Assessment

**Rating:** 7/10

**Strengths:**
- Modern, cohesive dark theme with elegant gold accent
- Well-crafted loading states and animations
- Clear visual hierarchy with excellent typography (Playfair Display + Inter)
- Thoughtful component structure
- Good visual feedback for interactions

**Areas for Improvement:**
- Color contrast issues
- Lack of accessible color alternatives
- Responsive design needs strengthening
- Component styling inconsistencies
- Missing error states and edge case designs
- Limited accessibility attributes

### Detailed Findings

#### 1. Typography & Color System
- Excellent font pairing: Playfair Display (headings) + Inter (body)
- Comprehensive color token system with CSS custom properties
- **Issue:** `--text-tertiary: #555555` has 3.0:1 contrast ratio (fails WCAG AA 4.5:1)
- **Recommendation:** Increase to `#6b7280` or lighter

#### 2. UI Components Analysis
- **Navbar:** Responsive, good density, but missing hamburger menu for mobile
- **PartCard:** Excellent locked state with blur, but reading timer lacks screen reader label
- **QuizSheet:** Natural slide-up animation, but options not keyboard-navigable
- **ProgressRail:** Clean representation, but labels small on mobile, not accessible
- **LoadingCinematic:** Elegant spinner, but no estimated time or cancel button
- **CompletionScreen:** Clear score display, but no visualization or celebration animation
- **QuestionInput:** Auto-resizing textarea, but character limit not enforced

#### 3. Responsive Design
- Uses `clamp()` for responsive typography
- Tailwind CSS configured for mobile-first
- **Issues:** Fixed pixel values, unclear mobile breakpoints, no tablet optimizations, overflow issues

#### 4. Accessibility (CRITICAL)
- **Semantic HTML:** Missing labels, no proper form structure
- **Focus Management:** No focus trapping in modals, no keyboard navigation for quiz options
- **Screen Reader Support:** No ARIA labels, no aria-live regions, no aria-expanded
- **Keyboard Accessibility:** Cannot skip quiz, no keyboard navigation for collapsible parts
- **Color Accessibility:** No alternative indicators beyond color

#### 5. Design System & Consistency
- Well-organized CSS custom properties
- **Inconsistencies:** Multiple border-radius values, inconsistent padding, mixed font size approaches, inconsistent shadows

#### 6. User Flow & UX
- Clear progression: Question → Loading → 3 Parts → Completion
- **Issues:** No error state UI, no empty states, no onboarding, no feedback mechanism, no progress persistence

#### 7. Performance & Code Quality
- Animation classes optimized
- Good component decomposition
- **Issues:** Extensive inline styles, potential layout reflows, bundle size concerns

### Priority Recommendations

**Critical:** Fix color contrast, add keyboard navigation, implement focus trapping, add error states, fix mobile responsiveness

**High:** Extract inline styles, add ARIA labels, add cancel button, standardize design tokens

**Medium:** Add celebration animation, implement form validation, add skip question option, create onboarding

**Low:** Add confetti, implement user accounts, add visual score display, create design system docs

---

## 4. IMPROVEMENT_PRIORITIES.md — Sprint-Based Improvement Roadmap

**File:** `IMPROVEMENT_PRIORITIES.md` (327 lines)
**Purpose:** A structured, sprint-based roadmap for implementing the design audit recommendations. Breaks down improvements into 6 sprints with estimated effort levels.

### Sprint 1: Critical Accessibility & Fixes (Week 1, ~16 hours)
- Color contrast fixes (2 hrs)
- Keyboard navigation (4 hrs)
- Modal focus management (3 hrs)
- ARIA labels (4 hrs)
- Error state UI (3 hrs)

### Sprint 2: Responsive Design (Week 2, ~16 hours)
- Mobile navigation with hamburger menu (4 hrs)
- Typography responsive system (3 hrs)
- Padding & spacing responsive (3 hrs)
- Component responsive fixes (4 hrs)
- Breakpoint testing (2 hrs)

### Sprint 3: Design System Refactoring (Week 3, ~16 hours)
- Create design tokens file (2 hrs)
- Extract component styles (8 hrs)
- Create Tailwind config extensions (3 hrs)
- Component style consistency (3 hrs)

### Sprint 4: UX Enhancements (Week 4, ~14 hours)
- Loading improvements (2 hrs)
- Completion celebrations (3 hrs)
- Follow-up actions (2 hrs)
- Onboarding flow (4 hrs)
- Feedback mechanism (3 hrs)

### Sprint 5: Performance & Polish (Week 5, ~12 hours)
- Code optimization (4 hrs)
- Error handling improvement (2 hrs)
- Empty states (2 hrs)
- Animation polish (2 hrs)
- Edge cases (2 hrs)

### Sprint 6: Documentation & Tooling (Week 6, ~14 hours)
- Storybook setup (6 hrs)
- Design system docs (3 hrs)
- Component documentation (3 hrs)
- Accessibility docs (2 hrs)

### Implementation Roadmap
- **Phase 1 (Weeks 1-2):** Foundation — Critical fixes + responsive design
- **Phase 2 (Weeks 3-4):** Quality — Design system refactor + UX enhancements
- **Phase 3 (Weeks 5-6):** Polish — Performance + documentation

### Quick Wins (1-2 hours each)
10 items already checked off, including contrast fixes, ARIA labels, focus styles, loading cancel button, retry button, skeleton loading, error toasts, and confetti.

### Success Metrics
- All text meets WCAG AA contrast standards
- 100% keyboard navigable
- Lighthouse accessibility audit 90+
- Works on mobile, tablet, desktop
- Consistent design tokens
- Lighthouse performance audit 90+
- Zero inline styles
- All states have visual design
- Delightful microinteractions

---

## 5. errors.md — AI Provider Migration & Debugging Log

**File:** `errors.md` (514 lines)
**Purpose:** A detailed engineering log documenting why the backend's AI integration changed shape multiple times, what broke at each stage, and what fixed it. This is the "war story" document that explains the forced migration chain.

### Why This Saga Happened

The backend originally called Google's Gemini API directly from Render. Google's edge infrastructure blocked requests from Render's shared datacenter IP ranges with a generic `403 Forbidden` — not an auth/quota error, but an IP-level block. Confirmed by testing the same request from a residential IP (worked instantly).

### Phase 0: Ruling Out Wrong Causes
- Model name correctness ✓
- API key restrictions ✓
- SDK itself ✓
- Cross-network test confirmed IP block

### Phase 1: Provider Migration Attempts
- Vertex AI → Auth issues (JWT signature, stale credentials)
- Groq → Doesn't host Gemma models
- Cloudflare Workers AI → Success! Hosts Gemma 4 weights directly

### Phase 2: Cloudflare Response Parsing Fixes
- Strip Gemma's "thinking" blocks before JSON parsing
- Simplified thinking-block filter regex
- Handled multiline reasoning prefixes

### Phase 3: Transport-Layer Fixes
- Replaced Cloudflare SDK with direct fetch (slash-encoding bug)
- Used OpenAI-compatible endpoint
- Removed broken `resolveModel` helper
- Made response-body extraction defensive
- Enforced 30-second minimum timeout

### Phase 4: Resilience and Error Handling
- Added retry logic and fallback-model support
- Tracked abort sources (timeout vs. caller vs. client)
- Fixed unescaped quotes in JSON
- CORS and normalization edge cases
- SSE stream cleanup and validation

### Phase 5: Safety and Moderation
- Fail-open LLM moderation layer
- Explicit Gemma safety-block handling
- Fixed crash on undefined sources

### Session 2026-07-04: Partial-Response Validation
- **Problem:** Model returned 2 parts (needed 3), missing key takeaways, content truncated
- **Root cause:** Model ran out of output-token budget
- **Fixes:** Added 403 to retryable codes, raised maxOutputTokens to 4000, made validation accept 1-N parts, added key-takeaways backfill

### Session 2026-07-05: Fast Mode Broken + Full Bug Sweep + Security Hardening
- **Fast mode bug:** Thinking tokens consumed output budget, leaving no room for quiz JSON
- **Fixes:** Both modes use 4000 tokens, salvage partial output, accept 1-2 quiz questions, fast prompt suppresses thinking
- **Security fixes:** 13 bugs including rate-limit key, token issuer trust, IDOR, CORS, debug endpoint lockdown, input validation
- **Legal sync:** Updated policies to v1.2 for Fast mode, correct AI provider, moderation logs

### Session 2026-07-06: Legal Sync + Dependency Upgrades + 24 Bug Sweep
- Legal documents synchronized to v1.3
- Next.js security patch (15.5.15 → 15.5.20)
- 24 defects found and fixed across backend, hooks/stores, components, and pages

### Session 2026-07-09: 408/Stream Failures + Moderation Log TTL
- Fixed intermittent 408 / "error in input stream" failures
- Added moderation log TTL index (90-day auto-expiry)
- Legal documents synchronized to v2.1

### Quick-Reference Tables
- Status codes and current handling
- Lessons for next time (debugging wisdom)

---

## 6. CONTRIBUTING.md — Contribution Guidelines

**File:** `CONTRIBUTING.md` (90 lines)
**Purpose:** Standard contribution guidelines for the RealLearn open-source project.

### How to Contribute

**Reporting Bugs:** Open a GitHub issue with clear title, reproduction steps, expected vs. actual behavior, screenshots, browser/OS info.

**Suggesting Features:** Open an issue with feature description, problem it solves, alternatives considered.

**Submitting Code:**
1. Fork the repository
2. Create a feature branch from `main`
3. Make changes
4. Run linting and build checks (`npm run lint`, `npm run build`, `node --check src/*.js`)
5. Commit with conventional format (`feat:`, `fix:`, `chore:`, `docs:`)
6. Push to fork
7. Open a Pull Request

### Development Setup
- Frontend: Copy `.env.local.example` to `.env.local`, fill Clerk keys, `npm install`, `npm run dev`
- Backend: Copy `.env.example` to `.env`, fill Cloudflare/Clerk/MongoDB/Serper keys, `npm install`, `npm start`

### Code Style
- Follow existing conventions
- TypeScript for frontend, ES Modules for backend
- Focused, small components
- Meaningful commit messages

### PR Guidelines
- Keep PRs focused on single changes
- Update documentation if needed
- Ensure build passes
- Be respectful in code reviews

---

## 7. CODE_OF_CONDUCT.md — Community Code of Conduct

**File:** `CODE_OF_CONDUCT.md` (71 lines)
**Purpose:** The Contributor Covenant Code of Conduct v2.0, adapted for the RealLearn community.

### Key Points

**Our Pledge:** Harassment-free participation regardless of age, body size, disability, ethnicity, sex characteristics, gender identity, experience level, education, socio-economic status, nationality, appearance, race, religion, or sexual identity.

**Standards:** Welcoming language, respect for viewpoints, graceful acceptance of criticism, focus on community benefit, empathy.

**Unacceptable Behavior:** Sexualized language, trolling, insults, harassment, publishing private information.

**Enforcement:** Four levels — Correction, Warning, Temporary Ban, Permanent Ban.

**Reporting:** esamzai365@gmail.com

---

## 8. SECURITY.md — Security Policy

**File:** `SECURITY.md` (64 lines)
**Purpose:** Security vulnerability reporting policy and overview of security measures.

### Supported Versions
- v1.2.x ✓
- v1.1.x ✓

### Reporting Vulnerabilities
- Email: esamzai365@gmail.com (do NOT open public GitHub issues)
- Include: Description, reproduction steps, potential impact, suggested fixes

### Safe Harbor
No legal action against researchers who: act in good faith, only interact with their own accounts, don't exploit beyond confirmation, report promptly.

### Response Timeline
- Acknowledgment: 48 hours
- Initial assessment: 7 days
- Fix + coordinated disclosure

### Security Measures
- Clerk JWT verification with JWKS + offline PEM fallback
- IDOR elimination
- Input validation (1000-char cap, allowlists, 100KB body limit)
- Multi-layer content moderation (regex + LLM)
- Per-user and per-IP rate limiting
- HTTPS encryption
- Strict CORS
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP, HSTS)
- Data minimization
- Full account deletion (Clerk + MongoDB + localStorage)
- Hashed rate-limit keys (SHA-256)
- Production-gated debug endpoints

### Scope
- **In scope:** reallearn.site, real-learn.onrender.com
- **Out of scope:** Third-party services (Clerk, Cloudflare, Serper, MongoDB Atlas, Vercel, Render)

---

## 9. LICENSE — MIT License

**File:** `LICENSE` (21 lines)
**Purpose:** Standard MIT License.

- **Copyright:** 2026 alakmar344
- **Terms:** Permission to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
- **Condition:** Include copyright notice and permission notice
- **Warranty:** None (provided "as is")

---

## 10. Cross-Document Themes & Insights

### The Iteration Story

The most striking theme across all documents is the **massive iteration** that happened after the initial hackathon submission. The `change-made-after-submission.md` file alone documents 290+ commits over 3 weeks. What was submitted as a basic version was transformed into a production-grade platform through:

1. **AI provider migration** — Forced by Google's IP blocking, migrated through 5 providers before settling on Cerebras + Cloudflare
2. **Security hardening** — From basic auth to comprehensive security with IDOR elimination, rate limiting, input validation, and multi-layer moderation
3. **Legal compliance** — From no legal framework to versioned Privacy Policy (v2.5), Terms of Service (v2.3), and Cookie Policy (v2.2) with COPPA/CCPA/DPDP compliance
4. **Accessibility** — From basic UI to WCAG 2.1 AA targeting with ARIA labels, keyboard navigation, focus management, and reduced-motion support
5. **Performance** — From 109-second cold starts to 50-second generation with caching, retries, and circuit breakers
6. **Design** — From gold-noir aesthetic to three beautiful themes with crayon backgrounds, a drifting ambient aurora layer, and adaptive performance tiers
7. **Gamification** — From no engagement system to XP, levels, streaks, 17 achievements, shareable result cards, hidden easter eggs, and attachment features (personal greetings, quote-of-the-day, a "learning together for N days" counter)
8. **Voice** — From no voice features to full TTS/STT in 12 languages
9. **Storage** — From localStorage-only to IndexedDB archiving with tiered retention

### Engineering Discipline

The documentation reveals a high level of engineering discipline:
- **Comprehensive logging** — Every bug, every fix, every decision is recorded
- **Security-first thinking** — Multiple layers of defense, fail-open/fail-closed decisions documented
- **Legal awareness** — Privacy policies updated with every feature change
- **Accessibility commitment** — WCAG 2.1 AA compliance tracked systematically
- **Performance consciousness** — Token budgets, latency targets, caching strategies all documented

### Production Readiness

Despite being a hackathon project, RealLearn demonstrates production-grade engineering:
- Rate limiting with per-user hashing
- Circuit breakers with automatic recovery
- Two-tier caching (memory + MongoDB)
- Graceful degradation at every layer
- Comprehensive error handling
- Security headers and CORS
- Consent management with versioned re-acceptance
- Account deletion with full data erasure

### The Gemma 4 Integration

The AI integration is the most technically complex aspect:
- **Structured output enforcement** via carefully engineered system prompts
- **Multi-stage JSON repair pipeline** (7 stages)
- **Partial lesson salvage** for truncated responses
- **Dual prompt architecture** (Fast vs. Explain)
- **Adaptive difficulty calibration** per level
- **Native multilingual generation** in 12 languages
- **Real-world grounding** via Serper news API
- **Fail-open moderation** with independent timeouts
- **Token budget management** with thinking-mode control

---

## Summary

RealLearn is a comprehensive, production-grade AI learning platform built for the Gemma 4 Good Hackathon. The documentation spans 9 files totaling approximately 2,800 lines, covering:

- **Product vision and features** (README.md)
- **290+ commits of post-submission iteration** (change-made-after-submission.md)
- **Design audit with actionable recommendations** (DESIGN_AUDIT.md)
- **Sprint-based improvement roadmap** (IMPROVEMENT_PRIORITIES.md)
- **Engineering debugging war stories** (errors.md)
- **Contribution guidelines** (CONTRIBUTING.md)
- **Community standards** (CODE_OF_CONDUCT.md)
- **Security policy** (SECURITY.md)
- **MIT License** (LICENSE)

The project demonstrates a remarkable evolution from a basic hackathon submission to a sophisticated, well-documented, security-conscious, accessibility-focused learning platform — all built in approximately 3 weeks of intensive iteration.

---

*This summary was generated from all documentation files in the RealLearn repository.*
