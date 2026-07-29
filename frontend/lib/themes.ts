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
    hint: "Warm alabaster daylight, solar terracotta accent",
    bg: "#FAF9F6",
    swatch: "#FAF9F6",
    accent: "#EE5125",
  },
  {
    value: "dark",
    label: "Ink",
    hint: "Midnight obsidian, glowing ember accent",
    bg: "#0D1117",
    swatch: "#0D1117",
    accent: "#FF6435",
  },
];
