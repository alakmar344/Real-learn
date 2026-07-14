"use client";

/**
 * Adaptive visual-performance tiers.
 *
 * The UI uses several compositing-heavy effects (backdrop blurs, a fixed
 * full-viewport background, paper-grain blend mode, always-running flame /
 * pulse animations). On low-end devices these are the difference between a
 * smooth page and a laggy one, while high-end devices barely notice them.
 *
 * The resolved tier is written to <html data-perf="low|mid|high"> (first by a
 * tiny pre-paint script in app/layout.tsx, then kept in sync by ThemeApplier)
 * and globals.css gates the effects per tier:
 *   • low  — effects stripped: no backdrop blur, no grain, no ambient
 *            animations, no background art. Maximum compatibility.
 *   • mid  — the balanced default.
 *   • high — full visual experience with richer background presence.
 */

export type PerfMode = "auto" | "low" | "high";
export type PerfTier = "low" | "mid" | "high";

export const PERF_MODE_OPTIONS: Array<{
  value: PerfMode;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "Auto",
    description: "Detects your device and picks the best balance.",
  },
  {
    value: "low",
    label: "Lite",
    description: "Fastest and smoothest — turns off blurs, textures, and ambient animations.",
  },
  {
    value: "high",
    label: "Rich",
    description: "Full visual experience for powerful devices.",
  },
];

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Heuristic device-tier detection. Safe to call only in the browser. */
export function detectPerfTier(): PerfTier {
  try {
    const nav = navigator as NavigatorWithHints;
    const memory = nav.deviceMemory ?? 8; // Safari/Firefox don't expose it
    const cores = nav.hardwareConcurrency ?? 8;
    const saveData = Boolean(nav.connection?.saveData);
    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // matchMedia unavailable — ignore
    }
    if (memory <= 4 || cores <= 4 || saveData || reducedMotion) return "low";
    if (memory >= 8 && cores >= 8) return "high";
    return "mid";
  } catch {
    return "mid";
  }
}

export function resolvePerfTier(mode: PerfMode): PerfTier {
  return mode === "auto" ? detectPerfTier() : mode;
}
