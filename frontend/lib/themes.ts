import { Theme } from "@/types";

/**
 * Single source of truth for theme pickers (ThemeModal, PreferenceModal,
 * Settings) — the three rooms of the Bold Canvas design language.
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
    label: "Canvas",
    hint: "Crisp cool-white daylight with an electric-blue charge",
    bg: "#F6F7FB",
    swatch: "#F6F7FB",
    accent: "#3D5AFE",
  },
  {
    value: "dark",
    label: "Void",
    hint: "Deep OLED night with a bright electric-blue accent",
    bg: "#0B0D14",
    swatch: "#0B0D14",
    accent: "#6C8BFF",
  },
  {
    value: "twilight",
    label: "Dusk",
    hint: "Teal evening warmed by coral and rose — sunset energy",
    bg: "#142028",
    swatch: "#142028",
    accent: "#FF9E7A",
  },
];
