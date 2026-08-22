"use client";

import { usePreferenceStore } from "@/store/preferenceStore";
import { TranslationKey, translate } from "@/lib/i18n";
import { dirFor } from "@/lib/locale";
import { useMounted } from "@/hooks/useMounted";
import { Language } from "@/types";

export function useTranslation() {
  const persistedLanguage = usePreferenceStore((s) => s.language);
  const mounted = useMounted();
  // Hydration safety: use English during SSR, then active persisted language on mount
  const language: Language = (mounted ? persistedLanguage : "English") || "English";
  const dir = dirFor(language);
  const isRtl = dir === "rtl";

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    return translate(key, language, params);
  };

  return {
    t,
    language,
    dir,
    isRtl,
  };
}
