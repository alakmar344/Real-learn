/**
 * palette.ts — the single source of truth for JS-side brand colors.
 *
 * CSS owns theming through custom properties in globals.css, but canvas
 * confetti, share-card rendering and particle bursts can't read CSS vars
 * cheaply at draw time. Before this file existed each surface invented its
 * own palette (gold confetti, blue/teal completion burst, sky-blue share
 * card, orange hearts) — three unrelated brand identities inside one flow.
 *
 * Everything here derives from the Olive Frenzy Minimal system: olive
 * `#556B2F` (light anchor) / lime-olive `#A4C639` (dark glow) as the single
 * accent family, emerald for success, warm cream/olive-black neutrals.
 * NO purple/violet, NO gold (owner's rules).
 */

export type ThemeName = "light" | "dark";

/** Resolve the active theme from the <html data-theme> attribute. */
export function activeTheme(): ThemeName {
  if (typeof document !== "undefined") {
    if (document.documentElement.getAttribute("data-theme") === "dark") return "dark";
  }
  return "light";
}

/** Rating stars — warm ember glow (amber retired: gold is banned). */
export function starColor(theme: ThemeName = activeTheme()): string {
  return theme === "dark" ? "#FB923C" : "#EA580C";
}

/** rgba() from a #RRGGBB hex — for canvas gradients/shadows that need
    translucent brand colors without hardcoding a second palette. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Share-card canvas palette (drawn at export time, so it uses the LIGHT
 * theme for legibility in feeds regardless of the app theme).
 */
export const SHARE_CARD = {
  paper: "#FAF9F3",
  card: "#FFFFFF",
  ink: "#1B2014",
  inkSoft: "#4D5340",
  brand: "#4E652A",
  brandBright: "#688532",
  mint: "#059669",
  amber: "#384C1C",
  border: "#E2DFCE",
} as const;
