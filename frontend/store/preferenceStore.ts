"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Theme, Language, Level } from "@/types";

function readExistingPreferences(): { theme?: Theme; language?: Language; level?: Level } {
  const result: { theme?: Theme; language?: Language; level?: Level } = {};
  try {
    const themeRaw = localStorage.getItem("reallearn-theme");
    if (themeRaw) {
      const theme = JSON.parse(themeRaw) as Theme;
      if (theme === "light" || theme === "dark") result.theme = theme;
    }

    const journeyRaw = localStorage.getItem("reallearn-journey");
    if (journeyRaw) {
      try {
        const data = JSON.parse(journeyRaw);
        if (data.language) result.language = data.language;
        if (data.level) result.level = data.level;
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
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setLevel: (level: Level) => void;
}

function prefLog(action: string, details?: unknown) {
  if (details === undefined) console.log(`[frontend][preferenceStore] ${action}`);
  else console.log(`[frontend][preferenceStore] ${action}`, details);
}

export const usePreferenceStore = create<PreferenceStore>()(
  persist(
    (set) => ({
      theme: existing.theme ?? "light",
      language: existing.language ?? "English",
      level: existing.level ?? "Class 9-10",
      setTheme: (theme) => {
        prefLog("setTheme", { theme });
        set({ theme });
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
