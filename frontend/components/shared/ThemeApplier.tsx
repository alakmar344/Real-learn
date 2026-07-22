"use client";

import { useEffect } from "react";
import { usePreferenceStore } from "@/store/preferenceStore";
import { THEME_OPTIONS } from "@/lib/themes";
import { resolvePerfTier } from "@/lib/performance";

export default function ThemeApplier() {
  const theme = usePreferenceStore((s) => s.theme);
  const perfMode = usePreferenceStore((s) => s.perfMode);

  // Keep the visual-performance tier in sync with the user's preference
  // (the pre-paint script in layout.tsx sets the initial value).
  useEffect(() => {
    document.documentElement.dataset.perf = resolvePerfTier(perfMode);
  }, [perfMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    // Keep the browser chrome (Android address bar, iOS status area) in sync
    // with the active theme's PAGE BACKGROUND (`bg`, mirrors --bg-primary) —
    // not the picker swatch, which once painted the address bar flag-orange.
    const swatch =
      THEME_OPTIONS.find((option) => option.value === theme)?.bg ?? "#FAFAF8";
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
