# RealLearn "Evergreen" Redesign — UX Audit, Design System & Implementation Record

> **Status: historical record.** This document records the "Evergreen"
> research-backed redesign (2026-07-28), the "Sunset Pop" vibrancy pass
> (2026-07-29), and the Cyber Aqua era (2026-07-30 → 2026-08-05). **The
> current canonical design system is now Olive Frenzy Minimal** (single
> olive accent family `#556B2F` light / lime-olive `#A4C639` dark, warm
> cream `#FAF9F3` / olive-black `#121510` canvases, Caveat script for
> decorative display moments, no purple/violet, no gold). See
> `docs/AGENT_MEMORY.md` §1 for the canonical description; everything below
> describes superseded states and is kept only as history.

> **Goal:** redesign RealLearn so Gen Z naturally feels at home — not by decorating
> it with "Gen Z" signifiers, but by applying what actually makes modern products
> feel effortless: clarity, strong hierarchy, expressive-but-restrained visuals,
> speed, and low cognitive load. This repo already tried the other path once
> (PR #271, "electric cyber Gen Z aesthetic") and had to revert it (PR #272).
> This document is the correction of course, and the record of what shipped.

---

## 1. UX Audit of the existing experience

A full-codebase audit (every page, every shared component, the token system,
motion, and a11y) surfaced the following state:

**What already worked well (deliberately preserved):**
- Robust lesson lifecycle (`useLesson.ts`): abort-on-new-request, retry/backoff, defensive SSE parsing.
- `LoadingCinematic` turning generation wait into real progress feedback.
- Honest streaks (a lapsed streak shows as dead, not perpetually alive).
- Non-blocking XP chips + batched celebration events.
- Strong a11y baseline: skip links, focus traps, `role=radiogroup` quizzes, live regions, pre-paint theme script (no FOUC), reduced-motion global kill-switch, perf-tier gating of expensive effects.
- First-attempt scoring ("perfect" = aced on first try) — a genuinely honest stat.

**What did not work** — see §2.

---

## 2. Problems ranked by severity

| # | Severity | Problem | Evidence |
|---|----------|---------|----------|
| 1 | Critical | **Neon palette with broken semantics.** Dark theme used pure `#00FF66` electric green on near-black with pure-white text (eye strain, halation); the error color `#FF3E00` doubled as the "action accent" — errors and CTAs shared a color. | `globals.css` old tokens |
| 2 | Critical | **Everything was bold.** `body { font-weight: 700 }` — all paragraph text rendered bold, destroying hierarchy and reading comfort. Mobile then *shrank* lesson text to 13px. | `globals.css:252`, 640px media query |
| 3 | Critical | **Mobile wayfinding was broken.** Below 900px the navbar links disappear and the sidebar (hamburger) contains no Home/Progress destination. There was literally no visible route to `/progress` beyond a small chip, and none to Home. | `Navbar.tsx:16`, `Sidebar.tsx` |
| 4 | High | **Punishing quiz gate.** One wrong answer reshuffled *all* options and restarted the quiz from Q1 ("Run It Back") — a struggling learner loops indefinitely, losing correct work each time. | `QuizSheet.tsx:149-164` |
| 5 | High | **The only forward affordance was hidden.** Until the reading timer elapsed, the lone "continue" control was a 13px, 70%-opacity tertiary link with a sub-44px target. | `PartCard.tsx:243-262` |
| 6 | High | **Three competing brand palettes in one flow.** Green UI → gold/tan confetti → blue/teal/pink completion burst → sky-blue share card → orange hearts. | `page.tsx:338`, `CompletionScreen`, `ShareResult`, `EngagementLayer`, `EasterEggs` |
| 7 | High | **WCAG 2.2.2 violation on the homepage.** The suggested-question chip auto-rotated every 3.5s with no pause control — a moving click target that could swap between read and click. | `ExampleQuestions.tsx:27-32` |
| 8 | Medium | **Duplicate suggestion widgets.** The rotating chip and "Today's spark" stacked on the homepage with overlapping topic lists — decision overload beside the primary action. | `HomeStats.tsx:89-105` |
| 9 | Medium | Sub-44px tap targets: quiz close button, copy button, summary-card arrows, skip link, feedback stars. | multiple |
| 10 | Medium | Voice whiplash: "Quick W", "a rematch would hit different", "can you pass this? 💀" beside formal system copy. | `CompletionScreen`, `ShareResult` |
| 11 | Medium | Streak copy leaned on loss-aversion/guilt ("keep the flame alive") — the addictive-pattern edge of gamification. | `EngagementLayer`, `progress/page.tsx` |
| 12 | Medium | Done vs. current progress nodes distinguished by color alone; in dark mode both were literally `#00FF66`. | `ProgressRail.tsx` |
| 13 | Low | Settings' "← Back" collided with the fixed hamburger on mobile; `theme-color` fallback hex typo (`#0B0D14`); TL;DR banner pretended to summarize content it hadn't read. | `settings/page.tsx`, `ThemeApplier.tsx:25`, `PartCard.tsx` |

---

## 3. Design philosophy

**"Evergreen": calm surface, warm core.**

Research on how Gen Z actually engages with products they trust (as opposed to
stereotypes about them) consistently converges on the same properties: speed,
honesty, legibility, control, and *earned* — not manufactured — delight. The
products this cohort lives in daily are visually quiet and typographically
confident; energy comes from responsiveness and feedback, not decoration.

Principles applied throughout:

1. **One identity, everywhere.** A single emerald + amber system flows from CSS
   tokens through canvas confetti to the share card. Coherence *is* premium.
2. **Energy is a moment, not a wallpaper.** The warm amber companion appears
   only at energy moments (streaks, celebration, sparks). The rest of the
   interface stays calm so those moments land.
3. **Reward effort, never punish it.** Mastery gates stay (they're the
   product), but correct work is banked. Feedback celebrates progress and
   never mocks failure.
4. **The exit is always visible.** No affordance a user needs is hidden,
   dimmed, or moved while they aim at it.
5. **Motion communicates state.** Progress bars track real progress; the CTA
   *upgrades* (outline → filled) when the reading timer completes; everything
   honors `prefers-reduced-motion`.
6. **Accessibility is the floor, not a feature.** Every shipped color pairing
   was computed against WCAG before commit.

Identity note: the green-black dark canvas (`#0B100E`) is deliberately *not*
the neutral slate of Linear/Vercel-style dev tools, and the green-tinted paper
is deliberately not Apple white — a recognizably "RealLearn" room in both
lights, within the owner's standing rule (**no purple/violet**).

---

## 4. Design system specification

### 4.1 Color (all pairings verified; ratios vs. their actual background)

**Paper (light)**
| Token | Value | Contrast | Role |
|---|---|---|---|
| `--bg-primary` | `#F6F8F6` | — | green-tinted paper canvas |
| `--bg-card` | `#FFFFFF` | — | cards/surfaces |
| `--accent` | `#047857` | 5.48:1 on white | the ONE interactive accent (AA normal text) |
| `--accent-hover` | `#065F46` | — | hover/pressed |
| `--accent-companion` / `--accent-action` | `#B45309` | 5.02:1 | warm amber — energy moments only |
| `--text-primary` | `#101915` | 16.8:1 | body ink |
| `--text-secondary` | `#47554E` | 7.84:1 | supporting |
| `--text-tertiary` | `#5C6B63` | 5.62:1 | captions (still AA) |
| `--correct` / `--wrong` | `#15803D` / `#DC2626` | 5.02 / 4.83 | feedback — never reused as brand/CTA |
| Subjects | teal `#0F766E`, green `#15803D`, amber `#B45309`, olive `#4D7C0F`, cyan `#0E7490`, rust `#C2410C` | ≥3:1 | distinguishable, harmonized, no purple |

**Ink (dark)** — key deltas: canvas `#0B100E` (forest black), cards `#151D19`,
accent mint `#34D399` (8.9:1 on cards — vivid *without* neon), on-accent
`#052E1F` (7.7:1), text `#EDF3EF` off-white (15.3:1 — pure white causes
halation for astigmatic readers), amber `#FBBF24`, wrong `#F87171`, correct
`#4ADE80`.

### 4.2 Typography
- **Display:** Space Grotesk 700–800, tight tracking — headings only.
- **Body:** Inter **400** (was 700 globally — the single biggest readability fix), `line-height: 1.55`; lesson prose in Lora at 1.75.
- **UI chrome:** buttons/inputs/labels at 500–600.
- **Floor:** lesson reading text never renders below **16px** on phones (was 13px).
- Scale: 11 / 13 / 15 / 18 / 22 / 28 / 36 / 48 / 56 (existing tokens, retained).

### 4.3 Spacing, radius, elevation
- Spacing tokens retained: 6 / 10 / 16 / 24 / 32 / 48 / 64 / 80.
- Radii retained: 8 → 24px + pill. Cards `--radius-2xl`, controls `--radius-md/lg`.
- Shadows: soft neutral (`--shadow-sm/md/lg`); glow shadows now derive from the emerald accent at low alpha — depth, not bloom.

### 4.4 Motion
- Durations 120/200/300ms; reveal easing `cubic-bezier(0.16,1,0.3,1)`.
- Transform/opacity-only animations (compositor-cheap); backdrop blurs gated behind the `data-perf` tier; global `prefers-reduced-motion` kill-switch retained.
- State-communicating motion kept (quiz shake/pulse, unlock pop, reading progress); decorative confetti reduced to *one* consistent system.

### 4.5 Components & icons
- Buttons: filled accent (primary) / outlined `btn-toggle` (secondary) / underlined text (tertiary). All ≥44px targets.
- Icons: 1.8–2px stroke line icons (lock, home, library, progress) — no emoji as UI controls.
- New: `bottom-nav` (mobile tab bar), `settings-back` clearance rule.

---

## 5. Information architecture

**Before (mobile):** navbar links hidden below 900px; sidebar = saved lessons only; no route to Home or Progress. **After:**

```
Mobile (≤900px)                        Desktop (>900px)
┌──────────────────────┐               ┌──────────┬────────────────┐
│  content             │               │ Sidebar  │ Navbar (links) │
│                      │               │ (library,│    content     │
│                      │               │  new,    │                │
├──────────────────────┤               │  theme,  │                │
│ Learn│Library│Progress│  ← tab bar   │ settings)│                │
└──────────────────────┘               └──────────┴────────────────┘
```

- **Three primary destinations, thumb-reachable, 56px targets** (Fitts's law / thumb-zone research). "Library" opens the saved-lessons drawer — progressive disclosure instead of a fourth route.
- Homepage: **one** suggestion surface (chip + explicit shuffle next to the input) instead of two competing widgets — Hick's law: fewer choices before the primary action.
- Duplicate settings entry points left intact (they share one store) but copy divergence is now documented for follow-up.

---

## 6. Redesigned layouts (what shipped per page)

- **Home:** greeting → question input (primary) → single stable suggestion + shuffle → resume card → how-it-works strip. No moving targets.
- **Learn:** sticky context header; part cards with an honest "In this part" orientation banner; always-visible forward path (outline → filled CTA upgrade); locked parts explain exactly what unlocks them.
- **Quiz sheet:** bottom sheet retained (thumb-friendly); 44px close control at a reachable position; **missed-questions-only retry**.
- **Completion:** consistent emerald/amber celebration; supportive first-try framing; share card re-rendered in brand palette.
- **Progress:** copy shifted from loss-aversion to self-efficacy framing; heatmap/achievements retained.
- **Settings:** back control cleared from the hamburger, 44px target.

---

## 7. New interaction patterns

| Pattern | Behavior | Principle |
|---|---|---|
| **Banked mastery** | Wrong answers re-queue only the missed questions (reshuffled); correct answers persist | Mastery learning without punishment; protects competence (self-determination theory) |
| **CTA upgrade** | Forward button always exists; visual weight upgrades outline→filled when the reading timer completes | Visibility of system status; no hidden exits |
| **User-paced discovery** | Suggestion shuffle is a button, not a timer | WCAG 2.2.2; user control & freedom |
| **Tab-bar + drawer hybrid** | 3 primary tabs; deep archive behind "Library" | Thumb-zone reach; progressive disclosure |

---

## 8. Motion guidelines

1. Motion must encode a state change (progress, unlock, error, success) — decoration-only animation is capped at the single celebration system.
2. Transform + opacity only on the hot path; no animated blurs/filters; ambient layers are compositor-contained and disabled on `data-perf="low"`.
3. Every animation dies under `prefers-reduced-motion` (existing global rule verified and retained).
4. Duration discipline: micro-feedback ≤200ms, reveals ≤300–500ms, celebrations ≤2s and dismissible.

---

## 9. Engagement without addiction

- **Kept:** streaks, XP, levels, achievements, daily goal ring — with honest states (dead streaks look dead).
- **Changed:** guilt copy ("keep the flame alive") → self-efficacy copy ("showing up daily — that's how learning sticks"); quiz failure no longer erases progress; celebration surfaces unified and calm.
- **Why:** loss-aversion loops drive short-term retention but erode trust — the mechanism behind "streak anxiety." Competence + autonomy framing (self-determination theory) sustains intrinsic motivation, which is the only kind that survives in an education product.

---

## 10. Implementation record & next steps for developers

**Shipped in this change** (all verified: `tsc` 0 errors, `next lint` clean of new issues, `next build` clean, `verify:quiz` 150k/150k pass):

1. `app/globals.css` — full token overhaul (both themes), body weight 400, 16px mobile reading floor, bottom-nav styles, 44px quiz close, settings-back clearance.
2. `components/shared/BottomNav.tsx` (new) + `AppShell` integration.
3. `components/learning/QuizSheet.tsx` — banked-mastery retry, supportive copy.
4. `components/learning/PartCard.tsx` — visible forward path, honest orientation banner, 44px targets.
5. `lib/palette.ts` (new) — single JS-side brand palette; migrated: learn-page confetti, `CompletionScreen`, `ShareResult` (canvas + share text), `EngagementLayer`, `EasterEggs`, `FeedbackPrompt`.
6. `components/homepage/ExampleQuestions.tsx` — static chip + shuffle; `HomeStats` spark removed.
7. `components/learning/ProgressRail.tsx` — shape-coded states (done=outlined ✓, current=filled+halo, locked=outline lock).
8. `lib/themes.ts`, `ThemeApplier.tsx` (typo fix), `layout.tsx` — theme-color hexes synced to new canvases.
9. Copy pass: slang whiplash and guilt framing removed.

**Recommended follow-ups (not yet shipped):**
- Migrate remaining inline-style objects in `learn/page.tsx`, `CompletionScreen`, `settings/page.tsx` to the class-based system (consistency + smaller markup).
- Consolidate the duplicated focus-trap in `QuizSheet` onto `hooks/useFocusTrap`.
- Reduce completion-screen CTA count (currently 3+ "ask another question" paths) to one primary + one secondary.
- Consider `aria-hidden` on blurred locked-part content so screen readers match the visual gate (product decision: is pre-reading locked content acceptable?).
- `LoadingCinematic`: render a 1-part skeleton in fast mode instead of the hardcoded 3-part deck.
- Remove dead `contexts/SidebarContext.tsx` or wire `AppShell` through it.
- Desktop learn layout: promote `ProgressRail` to a sticky side rail above 1200px.

---

## Addendum — "Sunset Pop" vibrancy pass (July 2026)

A follow-up pass turned the Solar Terracotta system up from calm to vibrant —
deliberately **not** a return to the reverted "electric cyber" extreme (PR
#271/#272). Grounded in current Gen Z design research (dopamine color used
with restraint, soft Y2K/Frutiger-Aero airiness, gradient display moments),
every change stays token-level and WCAG-AA-checked:

- **Sunset gradients** (`--accent-gradient`, `--text-pop-gradient`):
  terracotta → rose (light; every stop ≥3:1 under white CTA text) and
  amber → ember → rose (dark; near-black CTA text). Applied to `.btn-primary`
  and gradient display text (`.text-gradient`, `.hero__title-name`), with a
  solid-accent fallback where `background-clip: text` is unsupported.
- **Dopamine subject spectrum**: each subject chip now owns a distinct vivid
  hue (sky/emerald/amber/green/orange/rose/teal), ≥4.5:1 as chip text on the
  card in both themes. No purple/violet (owner's rule, unchanged).
- **Aurora turned from whisper to hum**: alphas raised (still ≤0.17) and a
  fourth rose wash added; still transform-only, still perf-tier gated.
- **Celebration palette** widened to the full spectrum (terracotta, rose,
  sky, emerald, amber) for confetti/bursts; share-card canvas re-synced to
  the terracotta brand.
- **Consistency fixes**: `themes.ts` picker copy/swatches, `ThemeApplier`
  fallback, the pre-paint theme-color script, and the README design bullet
  all still pointed at retired Evergreen hexes — now synced to
  `#FAF9F6` / `#0D1117` / `#EE5125` / `#FF6435`.

---

## Addendum (2026-07-31) — "Liquid Flow" structural pass (current)

The Cyber Aqua palette (see `AGENT_MEMORY.md` §1) is unchanged; this pass
rebuilt the STRUCTURE of the lesson experience onto one frosted-glass
language:

- **Tokens**: `--surface-glass`, `--surface-glass-strong`, `--surface-veil`,
  `--shadow-float`; radius scale raised to 12/16/20/26/32.
- **Part cards** (`.part-card__*`): fluid glass panels — ghost outline
  numeral, capsule meta pills, gradient intent rule (boxed TL;DR banner
  removed), Lora prose, gradient reading-progress line, frosted lock veil
  with a floating capsule. Inline-style soup removed from the component.
- **Journey rail** (`.journey-rail`): floating glass capsule; SVG check/lock
  nodes, gradient connector segments; fast mode gets a `--solo` capsule.
- **Quiz**: frosted sheet, centered floating panel on ≥720px, circular letter
  chips, accent-rule explanations (no boxes), gradient success action.
- **Generation loader**: 4px gradient bar, quiet step list, three
  materializing part capsules (`.loading-cinematic__parts`) replace the
  skeleton-card deck.
- **Homepage command bar** (`.q-form`): frosted floating surface, borderless
  action row, gradient mode glider; suggestion duo + resume capsule moved to
  `.suggest-duo` / `.resume-card`.
- **Follow-up / completion**: `.followup` mirrors the command bar;
  `.completion` gets a gradient score ring and `.suggest-pill` follow-ups.
- All new interactive classes are covered by the reduced-motion kill-switch;
  glass blurs remain gated by the `data-perf` tiers and the Firefox guard.

---

## Addendum (2026-08-01) — Liquid Flow deep pass on the remaining pages

The 07-31 app-wide pass wrapped the non-lesson pages in glass containers but
left their interiors as inline-style objects. This pass generalized the
parts-page anatomy into shared classes and rewrote every remaining
non-legal surface onto them:

- **Page shells + hero**: `.flow-page`/`.flow-page__inner(--narrow)`,
  `.page-column(--center)`, and `.page-hero` — overline, display title,
  gradient-tick subline, and a ghost glyph floating behind (the
  `.part-card__num` treatment: outline stroke, no fill).
- **Progress**: gradient `.level-orb`, gradient `.xp-track`, capsule
  `.pill-stat`s, `.streak-figure`, spring-hover `.goal-chip` toggles,
  `.duo-grid`/`.stat-band` layout classes.
- **Settings**: boxed 2px-border option buttons replaced by borderless
  `.option-row`s that rest transparent, lift on hover, and mark selection
  with an `--accent-dim` wash plus a journey-rail-style gradient check node;
  privacy/data actions became `.settings-action` rows; textarea →
  `.glass-textarea` with an accent focus ring; `.settings-back` styled
  (arrow nudges left on hover).
- **Sidebar**: full `.app-sidebar__*` anatomy; the JS `onMouseEnter`
  background mutations replaced with CSS `:hover`/`:focus-visible`; search
  became a pill `.sidebar-search` with focus ring; saved lessons are
  `.journey-item` rows that slide 2px on hover.
- **Navbar hub / home strip**: `.progress-hub__*` internals,
  `.mini-progress-link`, `.home-strip`; learn shell → `.learn-container` /
  `.learn-empty`; auth pages → `.auth-canvas`; 404 → `.not-found__code`
  ghost numeral.
- Inline styles now remain only for genuinely dynamic values (XP width,
  ring dashoffset, theme swatches, mode-glider transform). Reduced-motion
  kill-switch extended to every new interactive class. Legal pages untouched.

## Addendum — 2026-08-05: Tactile press system

Every actionable control is now a physical key, modeled on the sidebar
theme switch. One section at the end of `globals.css` owns the treatment:

- **Anatomy**: lit top bevel (`--key-bevel` / `--key-bevel-soft`), hard
  bottom edge (`--edge-accent` for filled CTAs, `--edge-neutral` for
  secondary keys), soft cast shadow. Light theme edges are machined gray
  (`#D4D4D8`); dark theme edges are near-black with the accent edge a
  deep cyan (`#0E7490` dark / `#155E75` light — same family as the CTA
  gradient's last stop, so the side reads as the same material).
- **Motion**: hover lifts the key 1px and grows the edge (3px→4px accent,
  2px→3px neutral); `:active` drops the key into its edge (translateY 2-3px,
  edge collapses to 0, `--key-pressed` inset shade) over 90ms; release pops
  back on the existing spring easings. Nav links, mode-glider options,
  sidebar rows, settings rows, and bottom-nav tabs get a lighter edge-less
  press (1px sink + 2% scale).
- **States**: disabled buttons and answered quiz options drop their edge —
  they are results, not controls. Focus-ring parity rules still win on
  keyboard focus. All newly animated classes were added to the
  reduced-motion kill lists.

## Addendum — 2026-08-05: 2026 polish layer

Progressive-enhancement CSS at the end of `globals.css` — every rule
degrades to the exact previous behavior in older engines:

- `text-wrap: balance` (headings, quiz questions) and `text-wrap: pretty`
  (markdown prose, sublines) for modern typographic rag.
- `font-variant-numeric: tabular-nums` on live counters so XP/streak/char
  numbers don't wobble as they tick.
- Scroll-driven card entrances: `.rl-card`, `.stat-tile(-2026)`,
  `.part-card`, `.resume-card` rise 14px as they enter the viewport via
  `animation-timeline: view()` — pure CSS, compositor-only, behind
  `@supports`, disabled on `data-perf="low"` and reduced-motion. Uses the
  individual `translate` property so tactile hover `transform` lifts
  compose instead of fighting.
- Touch honesty: tactile hover lifts live behind `@media (hover: hover)`;
  `touch-action: manipulation` kills the double-tap-zoom delay;
  `overscroll-behavior: contain` stops the quiz sheet and sidebar from
  scroll-chaining the page behind them; `scrollbar-gutter: stable` ends
  sideways layout shift between short and long pages.

## Addendum — 2026-08-06: Olive Frenzy Minimal (canonical)

The owner's "frenzy in minimalism" concept, mediated for this product:

- **Palette** — ONE olive family. Light: olive `#556B2F` accent (hover
  `#46591F`, bright `#6B8236`) on warm cream `#FAF9F3`, ink `#1F2318`.
  Dark (default): lime-olive `#A4C639` (hover `#8AAD26`, spark `#C3E85B`)
  on olive-black `#121510`, warm ivory `#F5F3E8` text. The hot-pink
  companion is retired; `--accent-companion` is the lime spark tier.
- **Contrast decisions** — dark-mode `--on-accent` is ink `#121510`
  (white on `#A4C639` is ~2:1 and banned); light CTAs keep white on
  `#556B2F` (5.9:1); every gradient stop ≥3:1 under its CTA text.
- **Frenzy layer** — Caveat script (`--font-script`): tilted oversized
  hero greeting overlapping the input card, script `.page-hero__glyph`
  ghosts, `.hero-ticker` kinetic marquee (transform-only, hover-pause,
  static under reduced-motion / low perf tier), `.script-display` utility.
  Script is decorative-Latin-only — never functional UI or lesson prose
  (12-language coverage stays on Inter).
- **Re-synced surfaces** — `lib/palette.ts` (confetti spectrum + share
  card), `lib/themes.ts`, `ThemeApplier` fallback, pre-paint theme-color
  script, `viewport.themeColor`, `manifest.json`, tactile key edge tokens
  (`--edge-accent` `#38471A` light / `#66801F` dark), auroras, focus rings.
