"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

/**
 * Syncs the persisted theme to the <html data-theme> attribute so the CSS
 * variable overrides in globals.css take effect. Rendered once near the root.
 */
export default function ThemeApplier() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    console.log("[frontend][ThemeApplier] applied theme", { theme });
  }, [theme]);

  return null;
}
