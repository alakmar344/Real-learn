import { Theme } from "@/types";

/**
 * Single source of truth for theme pickers (ThemeModal, PreferenceModal,
 * Settings) — the three moods of the Still Ink design language.
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
    hint: "Warm paper white with graphite ink — calm, bright, focused",
    bg: "#FAFAF8",
    swatch: "#FAFAF8",
    accent: "#5B5BD6",
  },
  {
    value: "dark",
    label: "Ink",
    hint: "Soft graphite night with a periwinkle accent — easy on the eyes",
    bg: "#101113",
    swatch: "#101113",
    accent: "#7D7EE8",
  },
  {
    value: "twilight",
    label: "Dusk",
    hint: "Deep indigo evening with candle warmth — for reading at night",
    bg: "#14151F",
    swatch: "#14151F",
    accent: "#8E90F0",
  },
];
