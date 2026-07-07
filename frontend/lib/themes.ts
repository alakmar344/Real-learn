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
    hint: "Warm cream — the classic textbook look",
    swatch: "#f8f4ed",
    accent: "#0d7a6a",
  },
  {
    value: "dark",
    label: "Night",
    hint: "Easy on the eyes for late-night study",
    swatch: "#0c1210",
    accent: "#3fd0be",
  },
  {
    value: "twilight",
    label: "Twilight",
    hint: "Deep indigo with a violet glow — bold and vivid",
    swatch: "#131120",
    accent: "#a78bfa",
  },
];
