"use client";

import { Level } from "@/types";

const LEVELS: Level[] = ["Class 6-8", "Class 9-10", "College / Advanced"];

interface Props {
  value: Level;
  onChange: (value: Level) => void;
  compact?: boolean;
}

export default function LevelSelector({ value, onChange, compact = false }: Props) {
  return (
    <label style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        aria-label="Learning level"
        value={value}
        onChange={(e) => onChange(e.target.value as Level)}
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
        {LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
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
