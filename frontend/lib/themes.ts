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
    hint: "Clean daylight with solid sky-blue accent",
    bg: "#FFFFFF",
    swatch: "#FFFFFF",
    accent: "#0284C7",
  },
  {
    value: "dark",
    label: "Ink",
    hint: "Pitch black night with solid sky-blue accent",
    bg: "#000000",
    swatch: "#000000",
    accent: "#38BDF8",
  },
  {
    value: "twilight",
    label: "Dusk",
    hint: "Pitch black evening with solid sky-blue accent",
    bg: "#000000",
    swatch: "#000000",
    accent: "#38BDF8",
  },
];
