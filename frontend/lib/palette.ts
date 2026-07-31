/**
 * palette.ts — the single source of truth for JS-side brand colors.
 *
 * CSS owns theming through custom properties in globals.css, but canvas
 * confetti, share-card rendering and particle bursts can't read CSS vars
 * cheaply at draw time. Before this file existed each surface invented its
 * own palette (gold confetti, blue/teal completion burst, sky-blue share
 * card, orange hearts) — three unrelated brand identities inside one flow.
 *
 * Everything here derives from the Evergreen system: deep emerald + mint
 * (brand), warm amber (energy/celebration companion), paper/ink neutrals.
 * NO purple/violet (owner's rule), no neon.
 */

export type ThemeName = "light" | "dark";

/** Resolve the active theme from the <html data-theme> attribute. */
export function activeTheme(): ThemeName {
  if (typeof document !== "undefined") {
    if (document.documentElement.getAttribute("data-theme") === "dark") return "dark";
  }
  return "light";
}

/** Confetti / particle-burst colors — emerald family + amber spark + paper. */
const CELEBRATION: Record<ThemeName, string[]> = {
  light: ["#EE5125", "#FF6435", "#04A16C", "#10B981", "#F59E0B", "#FBBF24", "#FFFFFF"],
  dark: ["#FF6435", "#FF8054", "#00D284", "#34D399", "#FBBF24", "#FDE68A", "#EDF3EF"],
};

export function celebrationColors(theme: ThemeName = activeTheme()): string[] {
  return CELEBRATION[theme];
}

/** Rating stars / streak flames — amber, the "energy" companion. */
export function starColor(theme: ThemeName = activeTheme()): string {
  return theme === "dark" ? "#FBBF24" : "#D97706";
}

/**
 * Share-card canvas palette (drawn at export time, so it uses the LIGHT
 * theme for legibility in feeds regardless of the app theme).
 */
export const SHARE_CARD = {
  paper: "#FAF9F6",
  card: "#FFFFFF",
  ink: "#0F172A",
  inkSoft: "#475569",
  brand: "#EE5125",
  brandBright: "#FF6435",
  mint: "#04A16C",
  amber: "#F59E0B",
  border: "#D4D1C5",
} as const;
