"use client";

import { Concept } from "@/types";

const SUBJECT_COLORS: Record<string, string> = {
  Physics: "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
  Chemistry: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
  Economics: "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
  Biology: "bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500/20",
  CS: "bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20",
  History: "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20",
  Geography: "bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/20",
  Mathematics: "bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20",
  "Political Science": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20",
  "Environmental Science": "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-green-500/20 text-green-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Hard: "bg-red-500/20 text-red-400",
};

interface ConceptBubbleProps {
  concept: Concept;
  isSelected: boolean;
  onClick: (concept: Concept) => void;
  isLoading?: boolean;
}

export default function ConceptBubble({
  concept,
  isSelected,
  onClick,
  isLoading = false,
}: ConceptBubbleProps) {
  const colorClass =
    SUBJECT_COLORS[concept.subject] ||
    "bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20";

  return (
    <button
      onClick={() => onClick(concept)}
      disabled={isLoading}
      className={`group relative flex flex-col gap-1.5 p-3 rounded-xl border transition-all text-left w-full ${
        isSelected
          ? `${colorClass} ring-1 ring-current shadow-lg`
          : `${colorClass} opacity-90`
      } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm leading-tight">{concept.name}</span>
        <span
          className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${
            DIFFICULTY_BADGE[concept.difficulty] || DIFFICULTY_BADGE["Medium"]
          }`}
        >
          {concept.difficulty}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs opacity-70 font-medium">{concept.subject}</span>
      </div>
      <p className="text-xs opacity-80 leading-relaxed line-clamp-2">{concept.teaser}</p>
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
    </button>
  );
}

export { SUBJECT_COLORS };
