"use client";

import { Language } from "@/types";
import { Icon } from "@/components/shared/icons";

const LANGUAGES: Language[] = [
  // Indian languages
  "English",
  "Hindi",
  "Gujarati",
  "Tamil",
  "Bengali",
  "Marathi",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Urdu",
  "Odia",
  // European languages
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Russian",
  "Polish",
  "Romanian",
  "Greek",
  "Czech",
  "Hungarian",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Ukrainian",
  "Turkish",
  "Catalan",
  "Bulgarian",
  "Croatian",
  "Serbian",
  "Slovak",
  "Slovenian",
  "Estonian",
  "Latvian",
  "Lithuanian",
  // East Asian languages
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Japanese",
  "Korean",
  // Southeast Asian languages
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Filipino",
  "Burmese",
  // Middle Eastern languages
  "Arabic",
  "Hebrew",
  "Persian",
  // South Asian languages
  "Nepali",
  "Sinhala",
  // African languages
  "Swahili",
  "Amharic",
  "Yoruba",
  "Zulu",
  // Central Asian & Caucasian languages
  "Georgian",
  "Armenian",
  "Kazakh",
  "Azerbaijani",
  "Uzbek",
];

interface Props {
  value: Language;
  onChange: (value: Language) => void;
  compact?: boolean;
  /** Lets an external visible <label htmlFor> bind to the select. */
  id?: string;
}

export default function LanguageSelector({ value, onChange, compact = false, id }: Props) {
  return (
    <label className={`select-control${compact ? " select-control--compact" : ""}`}>
      <select
        id={id}
        aria-label="Language"
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        className="select-control__field"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="select-control__caret">
        <Icon name="chevron-down" size={14} />
      </span>
    </label>
  );
}
