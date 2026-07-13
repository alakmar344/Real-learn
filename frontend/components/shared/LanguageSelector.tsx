"use client";

import { Language } from "@/types";

const LANGUAGES: Language[] = [
  "English",
  "Hindi",
  "Gujarati",
  "Tamil",
  "Bengali",
  "Marathi",
  "Telugu",
  "Kannada",
];

interface Props {
  value: Language;
  onChange: (value: Language) => void;
  compact?: boolean;
}

export default function LanguageSelector({ value, onChange, compact = false }: Props) {
  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <select
        aria-label="Language"
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        style={{
          appearance: "none",
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          color: "var(--text-primary)",
          borderRadius: compact ? "10px" : "12px",
          padding: compact ? "6px 28px 6px 10px" : "8px 30px 8px 12px",
          fontSize: compact ? "12px" : "13px",
          cursor: "pointer",
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: 10,
          color: "var(--text-secondary)",
          pointerEvents: "none",
          fontSize: 11,
        }}
      >
        ▼
      </span>
    </label>
  );
}
