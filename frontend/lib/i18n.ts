// frontend/lib/i18n.ts
import { Language } from "@/types";
import { TranslationKey, Translations, en } from "./translations/index";
import { hi, gu, ta, bn, mr, te, kn, ml, pa, ur, or as odia } from "./translations/indian";
import {
  es, fr, de, it, pt, nl, ru, pl, ro, el, cs, hu, sv, no, da, fi, uk, tr,
  ca, bg, hr, sr, sk, sl, et, lv, lt,
} from "./translations/european";
import {
  zhCN, zhTW, ja, ko, vi, th, id, ms, fil, my, ne, si,
} from "./translations/asian";
import {
  ar, he, fa, sw, am, yo, zu, ka, hy, kk, az, uz,
} from "./translations/middleEasternAfricanCaucasian";

export type { TranslationKey, Translations };

export const DICTIONARIES: Record<Language, Translations> = {
  // Indian languages
  English: en,
  Hindi: hi,
  Gujarati: gu,
  Tamil: ta,
  Bengali: bn,
  Marathi: mr,
  Telugu: te,
  Kannada: kn,
  Malayalam: ml,
  Punjabi: pa,
  Urdu: ur,
  Odia: odia,
  // European languages
  Spanish: es,
  French: fr,
  German: de,
  Italian: it,
  Portuguese: pt,
  Dutch: nl,
  Russian: ru,
  Polish: pl,
  Romanian: ro,
  Greek: el,
  Czech: cs,
  Hungarian: hu,
  Swedish: sv,
  Norwegian: no,
  Danish: da,
  Finnish: fi,
  Ukrainian: uk,
  Turkish: tr,
  Catalan: ca,
  Bulgarian: bg,
  Croatian: hr,
  Serbian: sr,
  Slovak: sk,
  Slovenian: sl,
  Estonian: et,
  Latvian: lv,
  Lithuanian: lt,
  // East Asian languages
  "Chinese (Simplified)": zhCN,
  "Chinese (Traditional)": zhTW,
  Japanese: ja,
  Korean: ko,
  // Southeast Asian languages
  Vietnamese: vi,
  Thai: th,
  Indonesian: id,
  Malay: ms,
  Filipino: fil,
  Burmese: my,
  // Middle Eastern languages
  Arabic: ar,
  Hebrew: he,
  Persian: fa,
  // South Asian languages
  Nepali: ne,
  Sinhala: si,
  // African languages
  Swahili: sw,
  Amharic: am,
  Yoruba: yo,
  Zulu: zu,
  // Central Asian & Caucasian languages
  Georgian: ka,
  Armenian: hy,
  Kazakh: kk,
  Azerbaijani: az,
  Uzbek: uz,
};

export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  English: "English",
  Hindi: "हिन्दी (Hindi)",
  Gujarati: "ગુજરાતી (Gujarati)",
  Tamil: "தமிழ் (Tamil)",
  Bengali: "বাংলা (Bengali)",
  Marathi: "मराठी (Marathi)",
  Telugu: "తెలుగు (Telugu)",
  Kannada: "ಕನ್ನಡ (Kannada)",
  Malayalam: "മലയാളം (Malayalam)",
  Punjabi: "ਪੰਜਾਬੀ (Punjabi)",
  Urdu: "اردو (Urdu)",
  Odia: "ଓଡ଼ିଆ (Odia)",
  Spanish: "Español (Spanish)",
  French: "Français (French)",
  German: "Deutsch (German)",
  Italian: "Italiano (Italian)",
  Portuguese: "Português (Portuguese)",
  Dutch: "Nederlands (Dutch)",
  Russian: "Русский (Russian)",
  Polish: "Polski (Polish)",
  Romanian: "Română (Romanian)",
  Greek: "Ελληνικά (Greek)",
  Czech: "Čeština (Czech)",
  Hungarian: "Magyar (Hungarian)",
  Swedish: "Svenska (Swedish)",
  Norwegian: "Norsk (Norwegian)",
  Danish: "Dansk (Danish)",
  Finnish: "Suomi (Finnish)",
  Ukrainian: "Українська (Ukrainian)",
  Turkish: "Türkçe (Turkish)",
  Catalan: "Català (Catalan)",
  Bulgarian: "Български (Bulgarian)",
  Croatian: "Hrvatski (Croatian)",
  Serbian: "Српски (Serbian)",
  Slovak: "Slovenčina (Slovak)",
  Slovenian: "Slovenščina (Slovenian)",
  Estonian: "Eesti (Estonian)",
  Latvian: "Latviešu (Latvian)",
  Lithuanian: "Lietuvių (Lithuanian)",
  "Chinese (Simplified)": "简体中文 (Chinese Simplified)",
  "Chinese (Traditional)": "繁體中文 (Chinese Traditional)",
  Japanese: "日本語 (Japanese)",
  Korean: "한국어 (Korean)",
  Vietnamese: "Tiếng Việt (Vietnamese)",
  Thai: "ไทย (Thai)",
  Indonesian: "Bahasa Indonesia (Indonesian)",
  Malay: "Bahasa Melayu (Malay)",
  Filipino: "Filipino",
  Burmese: "မြန်မာ (Burmese)",
  Arabic: "العربية (Arabic)",
  Hebrew: "עברית (Hebrew)",
  Persian: "فارسی (Persian)",
  Nepali: "नेपाली (Nepali)",
  Sinhala: "සිංහල (Sinhala)",
  Swahili: "Kiswahili (Swahili)",
  Amharic: "አማርኛ (Amharic)",
  Yoruba: "Yorùbá (Yoruba)",
  Zulu: "isiZulu (Zulu)",
  Georgian: "ქართული (Georgian)",
  Armenian: "Հայերեն (Armenian)",
  Kazakh: "Қазақша (Kazakh)",
  Azerbaijani: "Azərbaycan (Azerbaijani)",
  Uzbek: "Oʻzbekcha (Uzbek)",
};

/** Get translations map for a given language, with safe English fallback */
export function getDictionary(lang?: Language): Translations {
  if (!lang || !DICTIONARIES[lang]) return en;
  return DICTIONARIES[lang];
}

/** Translate a key with optional interpolation params e.g. {count}, {title} */
export function translate(
  key: TranslationKey,
  lang: Language = "English",
  params?: Record<string, string | number>
): string {
  const dict = getDictionary(lang);
  let text = dict[key] || en[key] || (key as string);
  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
    }
  }
  return text;
}
