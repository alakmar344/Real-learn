// One locale map for the supported lesson languages. Serves both the DOM
// (`lang`/`dir` on generated content — WCAG 2.1 §3.1.2 Language of Parts, so
// screen readers switch pronunciation instead of reading Hindi as English)
// and the Web Speech APIs (TTS + voice input) via hooks/useSpeech.

import { Language } from "@/types";

/** BCP-47 codes for every supported app language. */
export const LANG_CODES: Record<Language, string> = {
  // Indian languages
  English: "en-US",
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
  // European languages
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Portuguese: "pt-BR",
  Dutch: "nl-NL",
  Russian: "ru-RU",
  Polish: "pl-PL",
  Romanian: "ro-RO",
  Greek: "el-GR",
  Czech: "cs-CZ",
  Hungarian: "hu-HU",
  Swedish: "sv-SE",
  Norwegian: "nb-NO",
  Danish: "da-DK",
  Finnish: "fi-FI",
  Ukrainian: "uk-UA",
  Turkish: "tr-TR",
  Catalan: "ca-ES",
  Bulgarian: "bg-BG",
  Croatian: "hr-HR",
  Serbian: "sr-RS",
  Slovak: "sk-SK",
  Slovenian: "sl-SI",
  Estonian: "et-EE",
  Latvian: "lv-LV",
  Lithuanian: "lt-LT",
  // East Asian languages
  "Chinese (Simplified)": "zh-CN",
  "Chinese (Traditional)": "zh-TW",
  Japanese: "ja-JP",
  Korean: "ko-KR",
  // Southeast Asian languages
  Vietnamese: "vi-VN",
  Thai: "th-TH",
  Indonesian: "id-ID",
  Malay: "ms-MY",
  Filipino: "fil-PH",
  Burmese: "my-MM",
  // Middle Eastern languages
  Arabic: "ar-SA",
  Hebrew: "he-IL",
  Persian: "fa-IR",
  // South Asian languages
  Nepali: "ne-NP",
  Sinhala: "si-LK",
  // African languages
  Swahili: "sw-KE",
  Amharic: "am-ET",
  Yoruba: "yo-NG",
  Zulu: "zu-ZA",
  // Central Asian & Caucasian languages
  Georgian: "ka-GE",
  Armenian: "hy-AM",
  Kazakh: "kk-KZ",
  Azerbaijani: "az-AZ",
  Uzbek: "uz-UZ",
};

export function bcp47For(language?: string): string {
  return LANG_CODES[(language as Language) ?? "English"] ?? "en-US";
}

/** RTL scripts in the supported set. */
const RTL_LANGUAGES = new Set<Language>(["Urdu", "Arabic", "Hebrew", "Persian"]);

export function dirFor(language?: string): "rtl" | "ltr" {
  return RTL_LANGUAGES.has(language as Language) ? "rtl" : "ltr";
}

/** Spreadable `lang` + `dir` for containers that hold generated lesson text. */
export function contentLangAttrs(language?: string): {
  lang: string;
  dir: "rtl" | "ltr";
} {
  return { lang: bcp47For(language), dir: dirFor(language) };
}
