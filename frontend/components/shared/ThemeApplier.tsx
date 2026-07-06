"use client";

import { useEffect } from "react";
import { usePreferenceStore } from "@/store/preferenceStore";
import { THEME_OPTIONS } from "@/lib/themes";

export default function ThemeApplier() {
  const theme = usePreferenceStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    // Keep the browser chrome (Android address bar, iOS status area) in sync
    // with the active theme's background.
    const swatch =
      THEME_OPTIONS.find((option) => option.value === theme)?.swatch ??
      "#f7f3ec";
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = swatch;
  }, [theme]);

  return null;
}
