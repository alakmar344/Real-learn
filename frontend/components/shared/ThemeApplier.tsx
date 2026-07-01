"use client";

import { useEffect } from "react";
import { usePreferenceStore } from "@/store/preferenceStore";

export default function ThemeApplier() {
  const theme = usePreferenceStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    console.log("[frontend][ThemeApplier] applied theme", { theme });
  }, [theme]);

  return null;
}
