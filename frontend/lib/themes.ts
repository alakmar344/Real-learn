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
    label: "Crayon",
    hint: "Soft pastel crayon paper — playful and beginner-friendly",
    swatch: "#fbf7f0",
    accent: "#6d5fe0",
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
