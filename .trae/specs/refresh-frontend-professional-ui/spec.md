# Frontend Professional Refresh Spec

## Why
The current frontend feels visually rich and polished, but parts of the experience still read as playful, decorative, or oversized in ways that can feel childish instead of professional. This change defines a restrained visual refresh that keeps the product approachable while making the interface sleeker, more mature, and more credible.

## What Changes
- Reduce ornamental and playful visual treatments across the main frontend surfaces, especially on the homepage, shared navigation, cards, and primary controls.
- Replace oversized or overly attention-grabbing buttons with a more refined sizing, spacing, and emphasis system.
- Tighten the design language in global tokens and shared component classes so pages feel consistent, modern, and professional.
- Preserve accessibility, responsive behavior, and interaction clarity while simplifying visual noise.
- Keep the existing product structure and flows; this is a visual refinement, not an information architecture rewrite.

## Impact
- Affected specs: homepage presentation, shared navigation, shared card system, action controls, global visual tokens
- Affected code: `frontend/app/globals.css`, `frontend/app/page.tsx`, `frontend/components/shared/Navbar.tsx`, `frontend/components/homepage/QuestionInput.tsx`, `frontend/components/homepage/HomeStats.tsx`, shared button/card usage across `frontend/components/shared/*` and `frontend/components/learning/*`

## ADDED Requirements
### Requirement: Professional Visual Tone
The system SHALL present the frontend with a restrained and professional visual tone instead of a playful or childish one.

#### Scenario: Homepage first impression
- **WHEN** a user opens the homepage
- **THEN** the page uses a cleaner visual hierarchy, calmer decoration, and more mature styling cues
- **AND** decorative effects do not compete with the primary content or call to action

### Requirement: Refined Action Controls
The system SHALL use button styles that feel professional, balanced, and consistent across key user actions.

#### Scenario: Primary and secondary actions
- **WHEN** a user sees buttons on the homepage, navigation, learning flow, or settings pages
- **THEN** button sizes, padding, radius, shadows, and motion feel intentional and sleek rather than oversized or toy-like
- **AND** the primary action remains clearly identifiable without dominating the layout

### Requirement: Consistent Shared Styling
The system SHALL apply the refined visual direction through shared tokens and reusable component classes before page-specific exceptions.

#### Scenario: Shared surface consistency
- **WHEN** a user moves between homepage, progress, learning, and settings surfaces
- **THEN** cards, navigation, pills, and action controls follow the same updated professional style
- **AND** the interface feels cohesive instead of mixing multiple visual moods

## MODIFIED Requirements
### Requirement: Existing Frontend Design System
The existing frontend design system SHALL be updated to reduce excessive decoration, oversized interactive elements, and playful styling in favor of cleaner spacing, subtler effects, and a more professional visual hierarchy.

#### Scenario: Updating global design tokens
- **WHEN** shared visual tokens or reusable classes are revised
- **THEN** color, radius, shadow, motion, and spacing values support a sleeker interface
- **AND** the updated tokens continue to satisfy accessibility and responsive requirements

## REMOVED Requirements
### Requirement: Childlike Decorative Emphasis
**Reason**: The frontend should no longer rely on styling that makes key surfaces or controls feel childish, overly cute, or visually loud.
**Migration**: Replace those treatments with restrained tokens and shared component classes that communicate clarity, confidence, and professionalism.
