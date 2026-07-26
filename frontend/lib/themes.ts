import { Theme } from "@/types";

/**
 * Single source of truth for theme pickers (ThemeModal, PreferenceModal,
 * Settings) — the three rooms of the Soft Pastel design language.
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
    hint: "Warm cream daylight with a sky-blue accent",
    bg: "#FFFDF8",
    swatch: "#FFFDF8",
    accent: "#0284C7",
  },
  {
    value: "dark",
    label: "Ink",
    hint: "Warm charcoal night with a soft sky-blue accent",
    bg: "#1A1814",
    swatch: "#1A1814",
    accent: "#7FC5E8",
  },
  {
    value: "twilight",
    label: "Dusk",
    hint: "Teal evening warmed by peach and rose — sunset warmth",
    bg: "#142028",
    swatch: "#142028",
    accent: "#FF9E7A",
  },
];
