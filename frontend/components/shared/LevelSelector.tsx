"use client";

import { Level } from "@/types";
import { Icon } from "@/components/shared/icons";

// Backend enum values stay untouched; only the words people see change.
// "Class 6-8" meant nothing outside one school system — "Simple / Standard /
// Advanced" is understood by everyone.
const LEVELS: { value: Level; label: string }[] = [
  { value: "Class 6-8", label: "Simple — easy words, no background needed" },
  { value: "Class 9-10", label: "Standard — clear and balanced" },
  { value: "College / Advanced", label: "Advanced — full depth and detail" },
];

interface Props {
  value: Level;
  onChange: (value: Level) => void;
  compact?: boolean;
  /** Lets an external visible <label htmlFor> bind to the select. */
  id?: string;
}

export default function LevelSelector({ value, onChange, compact = false, id }: Props) {
  return (
    <label className={`select-control${compact ? " select-control--compact" : ""}`}>
      <select
        id={id}
        aria-label="Explanation depth"
        value={value}
        onChange={(e) => onChange(e.target.value as Level)}
        className="select-control__field"
      >
        {LEVELS.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="select-control__caret">
        <Icon name="chevron-down" size={14} />
      </span>
    </label>
  );
}
