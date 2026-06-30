"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AchievementId =
  | "first_lesson"
  | "perfect_score"
  | "explorer"
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "polyglot"
  | "speed_learner"
  | "master";

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  first_lesson: {
    id: "first_lesson",
    title: "First Lesson",
    description: "Complete your first learning journey",
    icon: "📚",
    xpReward: 50,
  },
  perfect_score: {
    id: "perfect_score",
    title: "Perfect Score",
    description: "Get all questions correct in a lesson",
    icon: "🎯",
    xpReward: 100,
  },
  explorer: {
    id: "explorer",
    title: "Explorer",
    description: "Learn about 5 different subjects",
    icon: "🔍",
    xpReward: 75,
  },
  streak_3: {
    id: "streak_3",
    title: "On a Roll",
    description: "Complete lessons for 3 days in a row",
    icon: "🔥",
    xpReward: 75,
  },
  streak_7: {
    id: "streak_7",
    title: "Dedicated Learner",
    description: "Complete lessons for 7 days in a row",
    icon: "⚡",
    xpReward: 150,
  },
  streak_14: {
    id: "streak_14",
    title: "Unstoppable",
    description: "Complete lessons for 14 days in a row",
    icon: "🚀",
    xpReward: 300,
  },
  polyglot: {
    id: "polyglot",
    title: "Polyglot",
    description: "Use 3 different languages",
    icon: "🌍",
    xpReward: 100,
  },
  speed_learner: {
    id: "speed_learner",
    title: "Speed Demon",
    description: "Complete a lesson in under 2 minutes",
    icon: "⚡",
    xpReward: 50,
  },
  master: {
    id: "master",
    title: "Master",
    description: "Complete 20 lessons",
    icon: "👑",
    xpReward: 500,
  },
};

interface AchievementState {
  unlockedAchievements: AchievementId[];
  totalXP: number;
  level: number;
  streak: number;
  lastCompletedDate: string | null;
  subjectsLearned: string[];
  languagesUsed: string[];
  lessonsCompleted: number;
  unlockAchievement: (id: AchievementId) => void;
  addXP: (xp: number) => void;
  recordCompletion: (subjects: string[], languages: string[], timeMs?: number) => void;
  checkStreak: () => void;
  getLevelTitle: () => string;
}

const LEVEL_TITLES = [
  "Novice",
  "Seeker",
  "Scholar",
  "Achiever",
  "Expert",
  "Master",
  "Grandmaster",
];

function getLevelFromXP(xp: number): number {
  if (xp >= 2000) return 6;
  if (xp >= 1000) return 5;
  if (xp >= 500) return 4;
  if (xp >= 200) return 3;
  if (xp >= 50) return 2;
  return 1;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      unlockedAchievements: [],
      totalXP: 0,
      level: 1,
      streak: 0,
      lastCompletedDate: null,
      subjectsLearned: [],
      languagesUsed: [],
      lessonsCompleted: 0,

      unlockAchievement: (id) => {
        set((state) => {
          if (state.unlockedAchievements.includes(id)) return state;
          
          const achievement = ACHIEVEMENTS[id];
          const newXP = state.totalXP + (achievement?.xpReward ?? 0);
          const newLevel = getLevelFromXP(newXP);
          
          return {
            unlockedAchievements: [...state.unlockedAchievements, id],
            totalXP: newXP,
            level: newLevel,
          };
        });
      },

      addXP: (xp) => {
        set((state) => {
          const newXP = state.totalXP + xp;
          return {
            totalXP: newXP,
            level: getLevelFromXP(newXP),
          };
        });
      },

      checkStreak: () => {
        const today = new Date().toDateString();
        set((state) => {
          const lastDate = state.lastCompletedDate;
          
          if (!lastDate) return { streak: 0 };
          
          const last = new Date(lastDate);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (last.toDateString() === yesterday.toDateString()) {
            return { streak: state.streak + 1 };
          }
          
          return { streak: 0 };
        });
      },

      recordCompletion: (subjects, languages, timeMs) => {
        const today = new Date().toISOString();
        set((state) => {
          const newStreak = state.lastCompletedDate
            ? (() => {
                const last = new Date(state.lastCompletedDate!);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (last.toDateString() === yesterday.toDateString()) {
                  return state.streak + 1;
                }
                if (last.toDateString() === today) {
                  return state.streak;
                }
                return 1;
              })()
            : 1;
          
          const newSubjects = Array.from(new Set([...state.subjectsLearned, ...subjects]));
          const newLanguages = Array.from(new Set([...state.languagesUsed, ...languages]));
          const newLessonsCompleted = state.lessonsCompleted + 1;
          
          const xpGained = 25;
          
          const newXP = state.totalXP + xpGained;
          const newLevel = getLevelFromXP(newXP);
          
          return {
            streak: newStreak,
            lastCompletedDate: today,
            subjectsLearned: newSubjects,
            languagesUsed: newLanguages,
            lessonsCompleted: newLessonsCompleted,
            totalXP: newXP,
            level: newLevel,
          };
        });
      },

      getLevelTitle: () => {
        const level = get().level;
        return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
      },
    }),
    {
      name: "reallearn-achievements",
      storage: createJSONStorage(() => localStorage),
    }
  )
);