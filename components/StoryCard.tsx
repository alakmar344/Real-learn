"use client";

import { Story } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  "Science & Space": "bg-blue-900/40 text-blue-400 border-blue-700/50",
  Technology: "bg-violet-900/40 text-violet-400 border-violet-700/50",
  Environment: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
  "Economics & Finance": "bg-amber-900/40 text-amber-400 border-amber-700/50",
  "Health & Medicine": "bg-pink-900/40 text-pink-400 border-pink-700/50",
  Geopolitics: "bg-red-900/40 text-red-400 border-red-700/50",
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
    "bg-card text-text-secondary border-border";
  const icon = CATEGORY_ICONS[story.category] || "📰";

  return (
    <article
      className="group relative flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-accent transition-all duration-200 hover:scale-[1.02] cursor-pointer animate-fade-in shadow-sm"
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
        <h2 className="text-base md:text-lg font-bold text-text-primary leading-snug line-clamp-2">
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
        <div className="w-full py-2.5 bg-accent text-black text-sm font-bold rounded-lg text-center group-hover:shadow-[0_0_12px_rgba(245,197,24,0.4)] transition-all duration-200">
          Uncover the Science →
        </div>
      </div>
    </article>
  );
}

export { CATEGORY_COLORS, CATEGORY_ICONS };

