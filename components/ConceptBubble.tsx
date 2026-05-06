"use client";

import { Concept } from "@/types";

const SUBJECT_COLORS: Record<string, string> = {
  Physics: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  Chemistry: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  Economics: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  Biology: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
  CS: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
  History: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  Geography: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100",
  Mathematics: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  "Political Science": "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
  "Environmental Science": "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
};

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
