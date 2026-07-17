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
    accent: "#1a3a8a",
  },
  {
    value: "dark",
    label: "Night",
    hint: "Deep moonlit illustration with rich midnight tones",
    swatch: "#080a12",
    accent: "#6b8ce8",
  },
  {
    value: "twilight",
    label: "Twilight",
    hint: "Dusk illustration with warm amber and deep indigo",
    swatch: "#08061a",
    accent: "#7080e8",
  },
];
