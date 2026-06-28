"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Theme } from "@/types";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        console.log("[frontend][themeStore] setTheme", { theme });
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === "dark" ? "light" : "dark";
          console.log("[frontend][themeStore] toggleTheme", { next });
          return { theme: next };
        }),
    }),
    {
      name: "reallearn-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
