"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Theme, Language, Level, LessonMode } from "@/types";
import type { PerfMode } from "@/lib/performance";
import {
  DEFAULT_LEARNING_PREFERENCES,
  type LearningPreferences,
  sanitizeLearningPreferences,
} from "@/lib/personalization";

const VALID_THEMES: Theme[] = ["light", "dark", "twilight"];
// SAFEGUARD: legacy localStorage values seed the store below, so every field
// must be validated against its allowlist — `theme` always was, but
// `language`/`level` were only checked to be strings, letting a corrupted or
// tampered legacy value inject an invalid enum that no downstream code
// expects (it is sent verbatim to the lesson API).
const VALID_LANGUAGES: Language[] = [
  "English", "Hindi", "Gujarati", "Tamil", "Bengali", "Marathi",
  "Telugu", "Kannada", "Malayalam", "Punjabi", "Urdu", "Odia",
];
const VALID_LEVELS: Level[] = ["Class 6-8", "Class 9-10", "College / Advanced"];

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
        if (VALID_LANGUAGES.includes(state?.language)) result.language = state.language;
        if (VALID_LEVELS.includes(state?.level)) result.level = state.level;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return result;
}

const existing = typeof window !== "undefined" ? readExistingPreferences() : {};

interface PreferenceStore {
  theme: Theme;
  language: Language;
  level: Level;
  mode: LessonMode;
  /**
   * Visual-performance preference: "auto" detects the device tier (memory,
   * cores, reduced-motion, data-saver), "low" forces the lightweight mode
   * (no backdrop blurs / grain / ambient animations) and "high" forces the
   * full high-end visual experience.
   */
  perfMode: PerfMode;
  /**
   * Optional learner personalization: learning-style checklist and free-text
   * notes. Stored only on the device, but sent with lesson-generation requests
   * so the AI can tailor its explanations.
   */
  personalization: LearningPreferences;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setLevel: (level: Level) => void;
  setMode: (mode: LessonMode) => void;
  setPerfMode: (perfMode: PerfMode) => void;
  setPersonalization: (personalization: LearningPreferences) => void;
  markPersonalizationOnboarded: () => void;
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
      perfMode: "auto",
      personalization: DEFAULT_LEARNING_PREFERENCES,
      setTheme: (theme) => {
        prefLog("setTheme", { theme });
        set({ theme });
      },
      setPerfMode: (perfMode) => {
        prefLog("setPerfMode", { perfMode });
        set({ perfMode });
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
      setPersonalization: (personalization) => {
        prefLog("setPersonalization", { personalization });
        set({ personalization: sanitizeLearningPreferences(personalization) });
      },
      markPersonalizationOnboarded: () => {
        prefLog("markPersonalizationOnboarded");
        set((state) => ({
          personalization: {
            ...sanitizeLearningPreferences(state.personalization),
            onboarded: true,
          },
        }));
      },
    }),
    {
      name: "reallearn-preferences",
      storage: createJSONStorage(() => localStorage),
      // Migration: legacy stores have no personalization field. Rehydration
      // merges persisted state over the defaults, so provide a sane default
      // without overwriting other fields.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.personalization) {
          state.personalization = DEFAULT_LEARNING_PREFERENCES;
        } else {
          state.personalization = sanitizeLearningPreferences(state.personalization);
        }
      },
    }
  )
);
