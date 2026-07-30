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
    label: "Light",
    hint: "Clean cyan, airy vibes",
    bg: "#FAFAFA",
    swatch: "#FAFAFA",
    accent: "#0891B2",
  },
  {
    value: "dark",
    label: "Dark",
    hint: "Deep space, neon cyan glow",
    bg: "#0A0A0F",
    swatch: "#0A0A0F",
    accent: "#06B6D4",
  },
];
