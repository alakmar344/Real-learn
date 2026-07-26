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
    hint: "Bright daylight with vivid green accent",
    bg: "#F8FAF9",
    swatch: "#F8FAF9",
    accent: "#00CC52",
  },
  {
    value: "dark",
    label: "Ink",
    hint: "Deep dark night with electric green accent",
    bg: "#0B0E14",
    swatch: "#0B0E14",
    accent: "#00FF66",
  },
];
