import { Theme } from "@/types";

/**
 * Single source of truth for theme pickers (ThemeModal, Settings).
 * Two themes: Paper (bright day) and Ink (dark night).
 * `bg` mirrors each theme's --bg-primary (used for the browser theme-color);
 * `swatch`/`accent` drive the picker preview.
 */
export interface ThemeOption {
  value: Theme;
  label: string;
  hint: string;
  /** The theme's page background (--bg-primary) — used for browser chrome. */
  bg: string;
  /** Picker preview color. */
  swatch: string;
  accent: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Paper",
    hint: "Soft green-tinted daylight, deep emerald accent",
    bg: "#F6F8F6",
    swatch: "#F6F8F6",
    accent: "#047857",
  },
  {
    value: "dark",
    label: "Ink",
    hint: "Deep forest night, calm mint accent",
    bg: "#0B100E",
    swatch: "#0B100E",
    accent: "#34D399",
  },
];
