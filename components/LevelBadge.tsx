"use client";

import { Level } from "@/types";

const LEVELS: { value: Level; label: string; emoji: string }[] = [
  { value: "Class 6-8", label: "Class 6-8", emoji: "🟢" },
  { value: "Class 9-10", label: "Class 9-10", emoji: "🟡" },
  { value: "College / Advanced", label: "College", emoji: "🔵" },
];

interface LevelBadgeProps {
  value: Level;
  onChange: (level: Level) => void;
  compact?: boolean;
}

export default function LevelBadge({ value, onChange, compact = false }: LevelBadgeProps) {
  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Level)}
        className="bg-card border border-border text-text-primary text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent cursor-pointer"
        aria-label="Select level"
      >
        {LEVELS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.emoji} {l.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
      {LEVELS.map((l) => (
        <button
          key={l.value}
          onClick={() => onChange(l.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            value === l.value
              ? "bg-accent text-black shadow-sm"
              : "text-text-secondary hover:text-text-primary hover:bg-surface"
          }`}
        >
          <span>{l.emoji}</span>
          <span className="hidden sm:inline">{l.label}</span>
        </button>
      ))}
    </div>
  );
}

