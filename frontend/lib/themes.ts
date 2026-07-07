import { Theme } from "@/types";

/**
 * Single source of truth for theme pickers (ThemeModal, PreferenceModal,
 * Settings). Swatches mirror each theme's --bg-primary / --accent pair.
 */
export interface ThemeOption {
  value: Theme;
  label: string;
  hint: string;
  swatch: string;
  accent: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Paper",
    hint: "Warm cream — calm and beginner-friendly",
    swatch: "#f7f3ec",
    accent: "#0d7a6a",
  },
  {
    value: "dark",
    label: "Night",
    hint: "Soft contrast for relaxed late-night study",
    swatch: "#0b100f",
    accent: "#3fd0be",
  },
  {
    value: "twilight",
    label: "Twilight",
    hint: "Ambient indigo glow with gentle focus",
    swatch: "#12101f",
    accent: "#a78bfa",
  },
];
