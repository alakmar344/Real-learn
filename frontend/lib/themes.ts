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
    label: "Saffron",
    hint: "Tricolor saffron dawn — warm light celebrating India's diversity",
    swatch: "#FF9933",
    accent: "#138808",
  },
  {
    value: "dark",
    label: "Emerald",
    hint: "Deep green night lit by diya gold — India's lush diversity",
    swatch: "#1B5E20",
    accent: "#FF9933",
  },
  {
    value: "twilight",
    label: "Tricolor",
    hint: "Saffron, white and green united — one India, many cultures",
    swatch: "#FF9933",
    accent: "#138808",
  },
];
