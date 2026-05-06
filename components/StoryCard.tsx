"use client";

import { Story } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  "Science & Space": "bg-blue-100 text-blue-700 border-blue-200",
  Technology: "bg-violet-100 text-violet-700 border-violet-200",
  Environment: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Economics & Finance": "bg-amber-100 text-amber-700 border-amber-200",
  "Health & Medicine": "bg-pink-100 text-pink-700 border-pink-200",
  Geopolitics: "bg-red-100 text-red-700 border-red-200",
};

const CATEGORY_ICONS: Record<string, string> = {
  "Science & Space": "🚀",
  Technology: "💻",
  Environment: "🌿",
  "Economics & Finance": "📈",
  "Health & Medicine": "🧬",
  Geopolitics: "🌐",
};

interface StoryCardProps {
  story: Story;
  onClick: (story: Story) => void;
  index: number;
}

export default function StoryCard({ story, onClick, index }: StoryCardProps) {
  const colorClass =
    CATEGORY_COLORS[story.category] ||
    "bg-gray-500/20 text-gray-400 border-gray-500/30";
  const icon = CATEGORY_ICONS[story.category] || "📰";

  return (
    <article
      className="group relative flex flex-col bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:scale-[1.01] cursor-pointer animate-fade-in shadow-sm"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => onClick(story)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(story)}
      aria-label={`Read story: ${story.headline}`}
    >
      {/* Category header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-0">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}
        >
          <span>{icon}</span>
          {story.category}
        </span>
      <span className="text-xs text-text-secondary font-medium">{story.region}</span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-3">
        <h2 className="text-base md:text-lg font-bold text-text-primary leading-snug group-hover:text-accent transition-colors line-clamp-3 font-serif">
          {story.headline}
        </h2>

        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 flex-1">
          {story.summary}
        </p>

        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{story.date}</span>
        </div>
      </div>

      {/* CTA Button */}
      <div className="px-3 pb-3">
        <div className="w-full py-2 bg-accent-light border border-accent/30 text-accent text-sm font-semibold rounded-lg text-center group-hover:bg-accent group-hover:text-white transition-all duration-300">
          Uncover the Science →
        </div>
      </div>

      <div className="absolute inset-0 rounded-xl ring-1 ring-accent/0 group-hover:ring-accent/20 transition-all pointer-events-none" />
    </article>
  );
}

export { CATEGORY_COLORS, CATEGORY_ICONS };
