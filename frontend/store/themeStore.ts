"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Theme } from "@/types";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        console.log("[frontend][themeStore] setTheme", { theme });
        set({ theme });
      },
    }),
    {
      name: "reallearn-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
