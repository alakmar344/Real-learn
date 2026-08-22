"use client";

import { Level } from "@/types";
import { Icon } from "@/components/shared/icons";

const LEVELS: Level[] = ["Class 6-8", "Class 9-10", "College / Advanced"];

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
        aria-label="Learning level"
        value={value}
        onChange={(e) => onChange(e.target.value as Level)}
        className="select-control__field"
      >
        {LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="select-control__caret">
        <Icon name="chevron-down" size={14} />
      </span>
    </label>
  );
}
