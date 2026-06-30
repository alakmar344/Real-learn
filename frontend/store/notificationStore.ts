"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface DailyChallenge {
  id: string;
  question: string;
  date: string;
  completed: boolean;
  xpBonus: number;
}

interface NotificationPreferences {
  dailyReminder: boolean;
  achievementUnlocked: boolean;
  streakMilestone: boolean;
}

interface NotificationState {
  permission: NotificationPermission | "default";
  preferences: NotificationPreferences;
  dailyChallenge: DailyChallenge | null;
  showAchievementNotification: (title: string, body: string) => void;
  requestPermission: () => Promise<NotificationPermission>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  checkDailyChallenge: () => void;
  completeDailyChallenge: () => void;
  getTodayChallenge: () => DailyChallenge | null;
}

const DEFAULT_CHALLENGES = [
  "Explain quantum computing like I'm 10",
  "How do vaccines work?",
  "Why is the sky blue?",
  "What causes seasons?",
  "How does photosynthesis work?",
  "Why do we dream?",
  "What is gravity?",
  "How do computers work?",
  "Why is water wet?",
  "What causes day and night?",
];

function getISODate(): string {
  return new Date().toISOString().split("T")[0];
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      permission: "default",
      preferences: {
        dailyReminder: true,
        achievementUnlocked: true,
        streakMilestone: true,
      },
      dailyChallenge: null,

      showAchievementNotification: (title, body) => {
        const { permission, preferences } = get();
        if (permission !== "granted" || !preferences.achievementUnlocked) return;
        
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.active?.postMessage({
              type: "SHOW_NOTIFICATION",
              title,
              body,
            });
          });
        } else if ("Notification" in window) {
          new Notification(title, { body, icon: "/favicon.ico" });
        }
      },

      requestPermission: async () => {
        if (!("Notification" in window)) {
          return "default";
        }
        
        const permission = await Notification.requestPermission();
        set({ permission });
        return permission;
      },

      updatePreferences: (prefs) => {
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        }));
      },

      checkDailyChallenge: () => {
        const today = getISODate();
        const { dailyChallenge } = get();
        
        if (!dailyChallenge || dailyChallenge.date !== today) {
          const challengeIndex = Math.floor(
            (today.charCodeAt(0) + today.charCodeAt(1)) % DEFAULT_CHALLENGES.length
          );
          const newChallenge: DailyChallenge = {
            id: `daily-${today}`,
            question: DEFAULT_CHALLENGES[challengeIndex],
            date: today,
            completed: false,
            xpBonus: 50,
          };
          set({ dailyChallenge: newChallenge });
        }
      },

      completeDailyChallenge: () => {
        set((state) => {
          if (!state.dailyChallenge || state.dailyChallenge.completed) return state;
          return {
            dailyChallenge: { ...state.dailyChallenge, completed: true },
          };
        });
      },

      getTodayChallenge: () => {
        const today = getISODate();
        return get().dailyChallenge?.date === today ? get().dailyChallenge : null;
      },
    }),
    {
      name: "reallearn-notifications",
      storage: createJSONStorage(() => localStorage),
    }
  )
);