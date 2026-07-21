# Task: Redesign Real-learn UI/UX - Japanese-inspired, world-class design

## Phase 1: Discovery & Analysis
- [x] Clone the repository alakmar344/Real-learn
- [x] Explore project structure and identify tech stack (Next.js 15, React 19, Tailwind, Clerk, Zustand)
- [x] Review all current UI components and pages
- [x] Document UI flaws and UX issues

## Phase 2: Design System Enhancements (globals.css)
- [x] Add reusable component classes (btn-primary, btn-ghost, btn-icon, nav-link, chip, section-header/overline, rl-card, stat-tile, scroll-top, kusari) to replace brittle inline handlers
- [x] Add focus-visible parity, scroll-to-top, better disabled states
- [x] Add Japanese ornamental motifs (kusari divider, section-overline kanji label)
- [x] Add part-card hover, part-cta, part-done-bar, btn-toggle, progress-hub classes

## Phase 3: Core Component Fixes
- [x] Navbar: add nav links (Home/Learn/Progress), fix logo gradient, active states
- [x] Sidebar: fix clashing purple logo gradient -> vermillion, polish buttons
- [x] QuestionInput: refactor inline handlers to classes, improve submit/disabled states
- [x] HomeStats: refactor spark button -> .chip, resume card -> .rl-card
- [x] ExampleQuestions: refactor to .chip class, remove inline handlers
- [x] Footer: fix brand cursor affordance (pointer + keyboard + title), polish
- [x] ProgressHub: refactor to .progress-hub class with hover/focus
- [x] PartCard: refactor all 3 buttons + article hover to CSS classes
- [x] Add ScrollToTop component on long pages (integrated into AppShell)
- [x] Apply section-overline + kusari motifs to progress & settings pages
- [x] Apply stat-tile class to progress dashboard StatTile

## Phase 4: Verification & Delivery
- [x] Build and verify no errors
- [x] Create feature branch, commit, push, create PR
