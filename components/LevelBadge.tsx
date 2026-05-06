"use client";

import { Level } from "@/types";

const LEVELS: { value: Level; label: string; emoji: string; color: string }[] = [
  { value: "Class 6-8", label: "Class 6-8", emoji: "🟢", color: "text-green-400" },
  { value: "Class 9-10", label: "Class 9-10", emoji: "🟡", color: "text-yellow-400" },
  { value: "College / Advanced", label: "College", emoji: "🔵", color: "text-blue-400" },
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
              ? "bg-surface text-text-primary shadow-sm border border-border"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <span>{l.emoji}</span>
          <span className="hidden sm:inline">{l.label}</span>
          <span className="sm:hidden">{l.label.split(" ")[0]}</span>
        </button>
      ))}
    </div>
  );
}
