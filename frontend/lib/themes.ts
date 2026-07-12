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
    hint: "Warm daylight crayon painting with pastel strokes",
    swatch: "#87ceeb",
    accent: "#6d5fe0",
  },
  {
    value: "dark",
    label: "Night",
    hint: "Moonlit crayon scene with deep blue tones",
    swatch: "#0a1628",
    accent: "#3fd0be",
  },
  {
    value: "twilight",
    label: "Twilight",
    hint: "Purple dusk crayon painting with warm sunset",
    swatch: "#1a1040",
    accent: "#a78bfa",
  },
];
