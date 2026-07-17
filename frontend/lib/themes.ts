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
    hint: "Warm daylight illustration with sophisticated pastel strokes",
    swatch: "#7BA7BC",
    accent: "#2f4cd0",
  },
  {
    value: "dark",
    label: "Night",
    hint: "Deep moonlit illustration with rich midnight tones",
    swatch: "#0e0e14",
    accent: "#8898ff",
  },
  {
    value: "twilight",
    label: "Twilight",
    hint: "Dusk illustration with warm amber and deep indigo",
    swatch: "#1a1040",
    accent: "#9fb0ff",
  },
];
