"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Theme, Language, Level, LessonMode } from "@/types";

const VALID_THEMES: Theme[] = ["light", "dark", "twilight"];

function readExistingPreferences(): { theme?: Theme; language?: Language; level?: Level } {
  const result: { theme?: Theme; language?: Language; level?: Level } = {};
  try {
    // Legacy keys were written by zustand persist, so the value is an
    // envelope: {"state":{...},"version":0} — NOT the bare value. Reading
    // the bare shape here silently reset every returning user's preferences.
    const themeRaw = localStorage.getItem("reallearn-theme");
    if (themeRaw) {
      const parsed = JSON.parse(themeRaw);
      const theme = (typeof parsed === "string" ? parsed : parsed?.state?.theme) as Theme;
      if (VALID_THEMES.includes(theme)) result.theme = theme;
    }

    const journeyRaw = localStorage.getItem("reallearn-journey");
    if (journeyRaw) {
      try {
        const data = JSON.parse(journeyRaw);
        const state = data?.state ?? data;
        if (typeof state?.language === "string") result.language = state.language;
        if (typeof state?.level === "string") result.level = state.level;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return result;
}

const existing = readExistingPreferences();

interface PreferenceStore {
  theme: Theme;
  language: Language;
  level: Level;
  mode: LessonMode;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setLevel: (level: Level) => void;
  setMode: (mode: LessonMode) => void;
}

function prefLog(action: string, details?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (details === undefined) console.log(`[frontend][preferenceStore] ${action}`);
  else console.log(`[frontend][preferenceStore] ${action}`, details);
}

export const usePreferenceStore = create<PreferenceStore>()(
  persist(
    (set) => ({
      theme: existing.theme ?? "light",
      language: existing.language ?? "English",
      level: existing.level ?? "Class 9-10",
      mode: "fast",
      setTheme: (theme) => {
        prefLog("setTheme", { theme });
        set({ theme });
      },
      setMode: (mode) => {
        prefLog("setMode", { mode });
        set({ mode });
      },
      setLanguage: (language) => {
        prefLog("setLanguage", { language });
        set({ language });
      },
      setLevel: (level) => {
        prefLog("setLevel", { level });
        set({ level });
      },
    }),
    {
      name: "reallearn-preferences",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
