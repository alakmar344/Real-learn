# RealLearn Improvement Priorities

This document breaks down design improvements into actionable sprints with estimated effort levels.

---

## Sprint 1: Critical Accessibility & Fixes (Week 1)

**Effort Level:** High  
**Goal:** Fix critical accessibility issues and basic UX problems

### Tasks

#### 1. Color Contrast Fixes (2 hours)
- [x] Update `--text-tertiary` — resolved in Japanese design update (#807078, 4.6:1)
- [x] Update `--text-secondary` — resolved in Japanese design update (#4a3a40, 6.5:1)
- [x] Test all text against WCAG AA standards
- [x] Document contrast ratios in design tokens (`frontend/app/globals.css`)

#### 2. Keyboard Navigation (4 hours)
- [x] Add `tabIndex` to quiz option buttons
- [x] Implement Enter/Space key handlers for options
- [x] Add proper focus styles for all interactive elements
- [x] Test full flow with keyboard only

#### 3. Modal Focus Management (3 hours)
- [x] Implement focus trapping in QuizSheet
- [x] Save previously focused element before modal opens
- [x] Restore focus to saved element on modal close
- [x] Add Escape key to close modal (when permitted)

#### 4. ARIA Labels (4 hours)
- [x] Add ARIA labels to all icon-only buttons
- [x] Add `aria-expanded` to collapsible parts
- [x] Add `aria-live` regions for toast messages
- [x] Add `aria-hidden` to decorative elements

#### 5. Error State UI (3 hours)
- [x] Create ErrorState component
- [x] Implement retry mechanism
- [x] Add user-friendly error messages
- [x] Style with consistent theme-aware classes

**Total Effort:** ~16 hours (2 days)

---

## Sprint 2: Responsive Design (Week 2)

**Effort Level:** Medium-High  
**Goal:** Ensure great experience on all devices

### Tasks

#### 1. Mobile Navigation (4 hours)
- [x] Add hamburger menu for navbar on mobile (`app-sidebar-toggle`)
- [x] Implement slide-out navigation panel (`Sidebar`)
- [x] Close menu when clicking outside (`app-sidebar-backdrop`)
- [x] Add touch-friendly interactions

#### 2. Typography Responsive System (3 hours)
- [x] Audit all font sizes
- [x] Replace fixed sizes with responsive utilities (`clamp()` + CSS tokens)
- [x] Test on mobile, tablet, desktop
- [x] Establish max-width constraints for readability

#### 3. Padding & Spacing Responsive (3 hours)
- [x] Create responsive spacing scale (`--space-*` tokens)
- [x] Replace fixed padding values with token classes
- [x] Optimize space on mobile
- [x] Ensure touch targets hit 44x44px minimum

#### 4. Component Responsive Fixes (4 hours)
- [x] PartCard: Adjust content padding on mobile
- [x] ProgressRail: Optimize for small screens
- [x] QuizSheet: Full-screen on mobile
- [x] QuestionInput: Full-width with proper mobile input

#### 5. Breakpoint Testing (2 hours)
- [x] Test on mobile (320px - 480px)
- [x] Test on tablet (481px - 1024px)
- [x] Test desktop (1025px+)
- [x] Document responsive behavior in `DESIGN_AUDIT.md`

**Total Effort:** ~16 hours (2 days)

---

## Sprint 3: Design System Refactoring (Week 3)

**Effort Level:** High  
**Goal:** Create consistent, maintainable styling approach

### Tasks

#### 1. Create Design Tokens File (2 hours)
- [x] Designate CSS token file — `frontend/app/globals.css` is the single source of truth
- [x] Organize spacing scale (`--space-*`)
- [x] Organize border-radius scale (`--radius-*`)
- [x] Organize shadow scale (`--shadow-*`)
- [x] Add color systematic variants (sumi/vermillion/subject tokens)

#### 2. Extract Component Styles (8 hours)
- [x] Extract inline styles from PartCard
- [x] Extract inline styles from QuizSheet
- [x] Extract inline styles from Navbar
- [x] Extract inline styles from ProgressRail
- [x] Extract inline styles from LoadingCinematic
- [x] Extract inline styles from QuestionInput
- [x] Extract inline styles from CompletionScreen
- [x] Extract inline styles from ErrorState
- [x] Extract inline styles from QuizQuestion

**Approach:** centralized component classes in `frontend/app/globals.css` (matches project convention; no CSS Modules needed).

#### 3. Create Tailwind Config Extensions (3 hours)
- [x] Add design tokens to Tailwind config (`tailwind.config.js` maps colors/spacing)
- [x] Create custom utility classes (`.btn-primary`, `.rl-card`, `.part-card`, etc.)
- [x] Map semantic tokens to utilities
- [x] Document usage patterns in `docs/AGENT_MEMORY.md` §5

#### 4. Component Style Consistency (3 hours)
- [x] Standardize border-radius usage (`--radius-sm/md/lg/xl/2xl`)
- [x] Standardize padding usage (`--space-*` tokens)
- [x] Standardize shadow usage (`--shadow-sm/md/lg`)
- [x] Standardize transition usage (`--ease-*` + `--dur-*`)

**Total Effort:** ~16 hours (2 days)

---

## Sprint 4: UX Enhancements (Week 4)

**Effort Level:** Medium  
**Goal:** Improve user experience and add delight

### Tasks

#### 1. Loading Improvements (2 hours)
- [x] Add patience reassurance to loading animation (after 30s)
- [x] Add cancel button to loading cinematic
- [x] Show progress indicator (progress bar + percent + checklist)
- [x] Add loading state for retry actions

#### 2. Completion Celebrations (3 hours)
- [x] Add confetti animation package (`canvas-confetti`)
- [x] Trigger confetti on completion
- [x] Visual score ring animation
- [x] Test celebration timing

#### 3. Follow-up Actions (2 hours)
- [x] Add "Retake Quiz" button
- [x] Add "Share Results" button
- [x] Add "Continue Learning" / follow-up button
- [x] Style buttons with appropriate hierarchy

#### 4. Onboarding Flow (4 hours)
- [x] Create onboarding modal (`PreferenceModal`)
- [x] Add product tour via preference explanation
- [x] Explain language selector impact
- [x] Explain level selector impact
- [x] Show example questions prominently

#### 5. Feedback Mechanism (3 hours)
- [x] Create satisfaction survey component (`FeedbackPrompt`)
- [x] Add optional anonymous feedback endpoint (`/api/feedback`)
- [x] Add feedback prompt after completion
- [x] Integrate with backend

**Total Effort:** ~14 hours (2 days)

---

## Sprint 5: Performance & Polish (Week 5)

**Effort Level:** Medium-Low  
**Goal:** Optimize performance and add polish

### Tasks

#### 1. Code Optimization (4 hours)
- [x] Review and optimize animations (transform/opacity only)
- [x] Add `will-change` where appropriate
- [x] Optimize bundle size (`next/dynamic`, `optimizePackageImports`)
- [x] Implement lazy loading for components

#### 2. Error Handling Improvement (2 hours)
- [x] Add error boundaries (implicit via ErrorState + retry)
- [x] Improve error messages
- [x] Add retry with backoff (backend + frontend)
- [x] Log errors for monitoring (server logs)

#### 3. Empty States (2 hours)
- [x] Design empty state for no lesson
- [x] Add illustration or icon
- [x] Provide helpful messaging
- [x] Add clear CTA

#### 4. Animation Polish (2 hours)
- [x] Add easing to all transitions (`--ease-*` tokens)
- [x] Ensure animations aren't jarring
- [x] Test on low-end devices (adaptive `data-perf` tiers)
- [x] Respect prefers-reduced-motion

#### 5. Edge Cases (2 hours)
- [x] Handle very long quiz questions
- [x] Handle very long part content
- [x] Handle character limits (1000-char question cap)
- [x] Handle rapid clicks/debouncing

**Total Effort:** ~12 hours (1.5 days)

---

## Sprint 6: Documentation & Tooling (Week 6)

**Effort Level:** Low  
**Goal:** Improve developer experience and maintainability

### Tasks

#### 1. Storybook Setup (6 hours)
- [ ] Install and configure Storybook (optional future tooling)
- [ ] Create stories for all components
- [ ] Document component props
- [ ] Add design token documentation

#### 2. Design System Docs (3 hours)
- [x] Create design system documentation (`docs/AGENT_MEMORY.md` §5)
- [x] Document color usage (`globals.css` + `DESIGN_AUDIT.md`)
- [x] Document typography scale (`globals.css` + `AGENT_MEMORY.md`)
- [x] Document spacing system (`globals.css`)
- [x] Add visual examples via component classes

#### 3. Component Documentation (3 hours)
- [x] Document component usage (`README.md` Deep Dive)
- [x] Document state management (`README.md` + `AGENT_MEMORY.md`)
- [x] Document hooks usage (`README.md` Deep Dive)
- [x] Add code examples (component usage in README)

#### 4. Accessibility Docs (2 hours)
- [x] Document accessibility requirements (`DESIGN_AUDIT.md`)
- [x] Document keyboard shortcuts (`DESIGN_AUDIT.md`)
- [x] Document ARIA patterns (`DESIGN_AUDIT.md` + `AGENT_MEMORY.md` §8)
- [x] Add testing guidelines (`AGENT_MEMORY.md` §3)

**Total Effort:** ~14 hours (2 days)

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Critical fixes
- Responsive design
- Ensure core functionality works perfectly

### Phase 2: Quality (Weeks 3-4)
- Design system refactor
- UX enhancements
- Consistency improvements

### Phase 3: Polish (Weeks 5-6)
- Performance optimization
- Documentation
- Developer experience

---

## Effort Summary

| Sprint | Topic | Effort | Priority |
|--------|-------|--------|----------|
| 1 | Critical Accessibility | 16 hrs | 🔴 Critical |
| 2 | Responsive Design | 16 hrs | 🔴 Critical |
| 3 | Design System Refactor | 16 hrs | 🟡 High |
| 4 | UX Enhancements | 14 hrs | 🟡 High |
| 5 | Performance & Polish | 12 hrs | 🟢 Medium |
| 6 | Docs & Tooling | 14 hrs | 🔵 Low |

**Total Effort:** ~88 hours (11-12 full working days)

---

## Quick Wins (Can be done in 1-2 hours each)

1. ✅ Update `--text-tertiary` color for contrast (resolved in Japanese design)
2. ✅ Add ARIA label to navigation logo
3. ✅ Add focus styles to all buttons
4. ✅ Add `aria-expanded` to collapsible parts
5. ✅ Add loading cancel button
6. ✅ Add retry button to error state
7. ✅ Standardize one component's padding
8. ✅ Add skeleton loading state
9. ✅ Add error message toast
10. ✅ Add confetti on completion

---

## Dependencies

- **Sprint 1** blocks nothing, should be done first
- **Sprint 2** can run parallel to Sprint 1
- **Sprint 3** should come after Sprint 1-2
- **Sprint 4** depends on Sprint 1-2 being done
- **Sprint 5** should come after Sprint 3
- **Sprint 6** can be done anytime, best after Sprint 3

---

## Success Metrics

After completing all sprints:

- ✅ All text meets WCAG AA contrast standards
- ✅ 100% keyboard navigable
- ✅ Passes Lighthouse accessibility audit (90+)
- ✅ Works seamlessly on mobile, tablet, desktop
- ✅ Consistent design tokens across all components
- ✅ Passes Lighthouse performance audit (90+)
- ✅ Comprehensive component documentation
- ✅ Major inline styles extracted to `frontend/app/globals.css` classes
- ✅ All states have visual design (loading, error, empty)
- ✅ Delightful microinteractions throughout

---