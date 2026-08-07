// One locale map for the 12 supported lesson languages. Serves both the DOM
// (`lang`/`dir` on generated content — WCAG 2.1 §3.1.2 Language of Parts, so
// screen readers switch pronunciation instead of reading Hindi as English)
// and the Web Speech APIs (TTS + voice input) via hooks/useSpeech.

import { Language } from "@/types";

/** BCP-47 codes (Indian-regioned) for every supported app language. */
export const LANG_CODES: Record<Language, string> = {
  English: "en-IN",
  Hindi: "hi-IN",
  Gujarati: "gu-IN",
  Tamil: "ta-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
  Telugu: "te-IN",
  Kannada: "kn-IN",
  Malayalam: "ml-IN",
  Punjabi: "pa-IN",
  Urdu: "ur-IN",
  Odia: "or-IN",
};

export function bcp47For(language?: string): string {
  return LANG_CODES[(language as Language) ?? "English"] ?? "en-IN";
}

/** Urdu is the only right-to-left script in the supported set. */
export function dirFor(language?: string): "rtl" | "ltr" {
  return language === "Urdu" ? "rtl" : "ltr";
}

/** Spreadable `lang` + `dir` for containers that hold generated lesson text. */
export function contentLangAttrs(language?: string): {
  lang: string;
  dir: "rtl" | "ltr";
} {
  return { lang: bcp47For(language), dir: dirFor(language) };
}
