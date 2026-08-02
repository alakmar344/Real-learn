# Tasks
- [ ] Task 1: Audit the current frontend for childish or overly decorative styling.
  - [ ] Review shared tokens and reusable classes in `frontend/app/globals.css`
  - [ ] Identify big buttons, loud gradients, heavy shadows, and playful motion in shared components
  - [ ] Confirm which shared components drive the current look on homepage and core product pages

- [ ] Task 2: Define the professional visual direction in the shared design system.
  - [ ] Update color, shadow, radius, spacing, and motion tokens to support a sleeker look
  - [ ] Refine shared button, chip, card, navbar, and input classes before page-specific adjustments
  - [ ] Preserve accessibility, responsive behavior, and visible interaction states

- [ ] Task 3: Apply the refreshed styling to the main customer-facing entry points.
  - [ ] Update homepage presentation in `frontend/app/page.tsx` and homepage components
  - [ ] Update shared navigation and other high-visibility shared surfaces
  - [ ] Remove or tone down styling that reads as childish while keeping the interface clear and inviting

- [ ] Task 4: Validate the redesign quality.
  - [ ] Review affected pages for visual consistency and professional tone
  - [ ] Run available frontend lint or verification commands
  - [ ] Fix any regressions introduced by the refresh

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
