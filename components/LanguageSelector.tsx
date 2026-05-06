"use client";

import { Language } from "@/types";

const LANGUAGES: { value: Language; label: string; native: string }[] = [
  { value: "English", label: "English", native: "English" },
  { value: "Hindi", label: "Hindi", native: "हिन्दी" },
  { value: "Gujarati", label: "Gujarati", native: "ગુજરાતી" },
  { value: "Tamil", label: "Tamil", native: "தமிழ்" },
  { value: "Bengali", label: "Bengali", native: "বাংলা" },
  { value: "Marathi", label: "Marathi", native: "मराठी" },
  { value: "Telugu", label: "Telugu", native: "తెలుగు" },
  { value: "Kannada", label: "Kannada", native: "ಕನ್ನಡ" },
];

interface LanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
  compact?: boolean;
}

export default function LanguageSelector({
  value,
  onChange,
  compact = false,
}: LanguageSelectorProps) {
  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        className="bg-surface border border-border text-text-primary text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent cursor-pointer"
        aria-label="Select language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.native}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        className="appearance-none bg-surface border border-border text-text-primary text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-accent cursor-pointer transition-colors hover:border-accent/50"
        aria-label="Select language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.native} ({lang.label})
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent opacity-60" />
    </div>
  );
}

export { LANGUAGES };
