/**
 * palette.ts — the single source of truth for JS-side brand colors.
 *
 * CSS owns theming through custom properties in globals.css, but canvas
 * confetti, share-card rendering and particle bursts can't read CSS vars
 * cheaply at draw time. Before this file existed each surface invented its
 * own palette (gold confetti, blue/teal completion burst, sky-blue share
 * card, orange hearts) — three unrelated brand identities inside one flow.
 *
 * Everything here derives from the Solar Terracotta system: terracotta +
 * ember (brand), rose + amber (dopamine celebration companions), emerald
 * (success), sky (air), alabaster/obsidian neutrals.
 * NO purple/violet (owner's rule).
 */

export type ThemeName = "light" | "dark";

/** Resolve the active theme from the <html data-theme> attribute. */
export function activeTheme(): ThemeName {
  if (typeof document !== "undefined") {
    if (document.documentElement.getAttribute("data-theme") === "dark") return "dark";
  }
  return "light";
}

/** Confetti / particle-burst colors — cyan + pink + mint celebration */
const CELEBRATION: Record<ThemeName, string[]> = {
  light: ["#0891B2", "#06B6D4", "#22D3EE", "#DB2777", "#EC4899", "#F472B6", "#10B981", "#34D399", "#FFFFFF"],
  dark: ["#06B6D4", "#22D3EE", "#67E8F9", "#EC4899", "#F472B6", "#F9A8D4", "#10B981", "#34D399", "#FAFAFA"],
};

export function celebrationColors(theme: ThemeName = activeTheme()): string[] {
  return CELEBRATION[theme];
}

/** Rating stars / streak flames — warm glow. */
export function starColor(theme: ThemeName = activeTheme()): string {
  return theme === "dark" ? "#FBBF24" : "#D97706";
}

/**
 * Share-card canvas palette (drawn at export time, so it uses the LIGHT
 * theme for legibility in feeds regardless of the app theme).
 */
export const SHARE_CARD = {
  paper: "#FAFAFA",
  card: "#FFFFFF",
  ink: "#18181B",
  inkSoft: "#52525B",
  brand: "#0891B2",
  brandBright: "#06B6D4",
  mint: "#10B981",
  amber: "#EC4899",
  border: "#E4E4E7",
} as const;
