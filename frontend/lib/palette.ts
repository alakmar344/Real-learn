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

/** Confetti / particle-burst colors — olive + lime + emerald celebration */
const CELEBRATION: Record<ThemeName, string[]> = {
  light: ["#556B2F", "#6B8236", "#A4C639", "#84CC16", "#3F6212", "#D9F99D", "#059669", "#34D399", "#FFFFFF"],
  dark: ["#A4C639", "#C3E85B", "#D9F99D", "#84CC16", "#65A30D", "#F5F3E8", "#10B981", "#34D399", "#FAF9F3"],
};

export function celebrationColors(theme: ThemeName = activeTheme()): string[] {
  return CELEBRATION[theme];
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
  ink: "#1F2318",
  inkSoft: "#565B48",
  brand: "#556B2F",
  brandBright: "#84CC16",
  mint: "#059669",
  amber: "#3F6212",
  border: "#E7E5D8",
} as const;
