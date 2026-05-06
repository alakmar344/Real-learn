"use client";

import { useState, useEffect, useCallback } from "react";
import { Story, Language, Level } from "@/types";
import StoryCard from "@/components/StoryCard";
import LessonPanel from "@/components/LessonPanel";
import LanguageSelector from "@/components/LanguageSelector";
import LevelBadge from "@/components/LevelBadge";

function StorySkeleton() {
  return (
    <div className="flex flex-col gap-4 bg-surface border border-border rounded-2xl p-4 animate-shimmer bg-gradient-to-r from-surface via-card to-surface bg-[length:200%_100%] shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 rounded-full bg-card" />
        <div className="h-4 w-16 rounded bg-card" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-full rounded bg-card" />
        <div className="h-6 w-4/5 rounded bg-card" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 w-full rounded bg-card" />
        <div className="h-4 w-3/4 rounded bg-card" />
      </div>
      <div className="h-10 w-full rounded-xl bg-card" />
    </div>
  );
}

function SettingsModal({
  language,
  level,
  onLanguageChange,
  onLevelChange,
  onClose,
}: {
  language: Language;
  level: Level;
  onLanguageChange: (l: Language) => void;
  onLevelChange: (l: Level) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 space-y-5 animate-slide-in-up sm:animate-fade-in shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-text-primary">Settings</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition-all"
            >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-secondary tracking-widest uppercase block mb-2">
              Language
            </label>
            <LanguageSelector value={language} onChange={onLanguageChange} />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary tracking-widest uppercase block mb-2">
              Level
            </label>
            <LevelBadge value={level} onChange={onLevelChange} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-accent text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [language, setLanguage] = useState<Language>("English");
  const [level, setLevel] = useState<Level>("Class 9-10");
  const [showSettings, setShowSettings] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("rl_language") as Language;
      const savedLevel = localStorage.getItem("rl_level") as Level;
      if (savedLang) setLanguage(savedLang);
      if (savedLevel) setLevel(savedLevel);
    } catch {}
  }, []);

  // Save preferences to localStorage
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem("rl_language", lang);
    } catch {}
  };

  const handleLevelChange = (lvl: Level) => {
    setLevel(lvl);
    try {
      localStorage.setItem("rl_level", lvl);
    } catch {}
  };

  const fetchStories = useCallback(async (forceRefresh = false) => {
    // Check session storage cache
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem("rl_stories");
        const cachedDate = sessionStorage.getItem("rl_stories_date");
        const today = new Date().toISOString().split("T")[0];
        if (cached && cachedDate === today) {
          setStories(JSON.parse(cached));
          return;
        }
      } catch {}
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fetch-stories");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setStories(data);
        try {
          sessionStorage.setItem("rl_stories", JSON.stringify(data));
          sessionStorage.setItem(
            "rl_stories_date",
            new Date().toISOString().split("T")[0]
          );
        } catch {}
      } else {
        throw new Error("No stories returned");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load stories. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-background text-sm">
              RL
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-text-primary text-lg tracking-tight">
                RealLearn
              </span>
              <span className="hidden md:inline text-text-secondary text-xs ml-2">
                The World Is Your Textbook
              </span>
            </div>
          </div>

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector
              value={language}
              onChange={handleLanguageChange}
            />
            <LevelBadge value={level} onChange={handleLevelChange} />
          </div>

          {/* Mobile settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition-all border border-transparent hover:border-border"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-text-secondary text-sm font-medium mb-1">{today}</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
              Today&apos;s World.{" "}
              <span className="text-accent">Today&apos;s Lesson.</span>
            </h1>
            <p className="text-text-secondary mt-2 text-sm md:text-base">
              Real news. Real concepts. No textbooks.
            </p>
          </div>

          <button
            onClick={() => fetchStories(true)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border text-text-primary text-sm font-semibold rounded-xl hover:border-accent hover:text-accent hover:bg-accent-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-sm"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? "Loading..." : "Load Today's Stories"}
          </button>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => fetchStories(true)}
              className="ml-auto underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stories Grid */}
      <main className="max-w-7xl mx-auto px-4 pb-16">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <StorySkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && stories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {stories.map((story, i) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={setSelectedStory}
                index={i}
              />
            ))}
          </div>
        )}

        {!loading && stories.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📰</div>
            <h3 className="text-text-primary font-semibold text-lg mb-2">
              Ready to Learn from the World?
            </h3>
            <p className="text-text-secondary text-sm mb-6">
              Click &quot;Load Today&apos;s Stories&quot; to fetch real news and uncover the
              science behind it.
            </p>
            <button
              onClick={() => fetchStories(true)}
              className="px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md"
            >
              Load Today&apos;s Stories →
            </button>
          </div>
        )}
      </main>

      {/* Lesson Panel */}
      {selectedStory && (
        <LessonPanel
          story={selectedStory}
          level={level}
          language={language}
          onClose={() => setSelectedStory(null)}
        />
      )}

      {/* Mobile Settings Modal */}
      {showSettings && (
        <SettingsModal
          language={language}
          level={level}
          onLanguageChange={handleLanguageChange}
          onLevelChange={handleLevelChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4 text-center">
        <p className="text-text-secondary text-xs">
          <span className="text-accent font-semibold">RealLearn</span> — Built for the{" "}
          <a
            href="https://www.kaggle.com/competitions/gemma-4-good-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-accent transition-colors underline"
          >
            Gemma 4 Good Hackathon
          </a>{" "}
          by Google DeepMind · Powered by Gemma 4
        </p>
      </footer>
    </div>
  );
}
