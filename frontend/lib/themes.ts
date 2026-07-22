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
    hint: "Soft cream washed with pastel sky and peach — warm daylight",
    bg: "#FDF9F3",
    swatch: "#FDF9F3",
    accent: "#0284C7",
  },
  {
    value: "dark",
    label: "Ink",
    hint: "Warm charcoal night lit by pastel sky and peach",
    bg: "#12161C",
    swatch: "#12161C",
    accent: "#7FC5E8",
  },
  {
    value: "twilight",
    label: "Dusk",
    hint: "Teal evening warmed by peach and rose — sunset calm",
    bg: "#142028",
    swatch: "#142028",
    accent: "#FFB08C",
  },
];
