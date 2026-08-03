"use client";

/**
 * Best-effort haptic feedback helper.
 *
 * Uses `navigator.vibrate` when available and the user has not requested
 * reduced motion. Patterns are tuned to feel meaningful but not intrusive:
 * - success: a short rise-then-finish burst (quiz pass, completion).
 * - error: two sharp ticks (wrong answer, blocked input).
 * - light: a single gentle tap (button presses, selections).
 */
export type HapticPattern = "success" | "error" | "light";

const PATTERNS: Record<HapticPattern, number[]> = {
  success: [40, 60, 120],
  error: [80, 60, 80],
  light: [25],
};

export function triggerHaptic(pattern: HapticPattern = "light") {
  if (typeof window === "undefined") return;
  try {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;
    const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
    if (nav.vibrate) {
      nav.vibrate(PATTERNS[pattern]);
    }
  } catch {
    // ignore unsupported environments
  }
}
