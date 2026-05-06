"use client";

import { Concept } from "@/types";

const SUBJECT_COLORS: Record<string, string> = {
  Physics: "bg-blue-900/30 text-blue-400 border-blue-700/50 hover:bg-blue-900/50",
  Chemistry: "bg-emerald-900/30 text-emerald-400 border-emerald-700/50 hover:bg-emerald-900/50",
  Economics: "bg-amber-900/30 text-amber-400 border-amber-700/50 hover:bg-amber-900/50",
  Biology: "bg-pink-900/30 text-pink-400 border-pink-700/50 hover:bg-pink-900/50",
  CS: "bg-violet-900/30 text-violet-400 border-violet-700/50 hover:bg-violet-900/50",
  History: "bg-red-900/30 text-red-400 border-red-700/50 hover:bg-red-900/50",
  Geography: "bg-teal-900/30 text-teal-400 border-teal-700/50 hover:bg-teal-900/50",
  Mathematics: "bg-orange-900/30 text-orange-400 border-orange-700/50 hover:bg-orange-900/50",
  "Political Science": "bg-indigo-900/30 text-indigo-400 border-indigo-700/50 hover:bg-indigo-900/50",
  "Environmental Science": "bg-green-900/30 text-green-400 border-green-700/50 hover:bg-green-900/50",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-emerald-900/40 text-emerald-400",
  Medium: "bg-yellow-900/40 text-yellow-400",
  Hard: "bg-red-900/40 text-red-400",
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
    "bg-card text-text-secondary border-border hover:bg-surface";

  return (
    <button
      onClick={() => onClick(concept)}
      disabled={isLoading}
      className={`group relative flex flex-col gap-1.5 p-3 rounded-xl border transition-all text-left w-full ${
        isSelected
          ? `${colorClass} ring-1 ring-current shadow-lg`
          : `${colorClass} opacity-80`
      } ${isLoading ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
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
      <p className="text-xs opacity-70 leading-relaxed line-clamp-2">{concept.teaser}</p>
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
    </button>
  );
}

export { SUBJECT_COLORS };


const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Hard: "bg-red-100 text-red-700",
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
    "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200";

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
