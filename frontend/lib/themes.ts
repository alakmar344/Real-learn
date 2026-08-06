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
    hint: "Warm cream, olive ink",
    bg: "#FAF9F3",
    swatch: "#FAF9F3",
    accent: "#556B2F",
  },
  {
    value: "dark",
    label: "Dark",
    hint: "Olive black, lime glow",
    bg: "#121510",
    swatch: "#121510",
    accent: "#A4C639",
  },
];
