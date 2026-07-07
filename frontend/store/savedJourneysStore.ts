"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SavedJourney } from "@/types";

interface SavedJourneysStore {
  journeys: SavedJourney[];
  saveJourney: (journey: SavedJourney) => void;
  removeJourney: (id: string) => void;
}

function journeyLog(action: string, details?: unknown) {
  if (details === undefined) {
    console.log(`[frontend][savedJourneys] ${action}`);
    return;
  }
  console.log(`[frontend][savedJourneys] ${action}`, details);
}

export function journeySignature(question: string, firstPartTitle?: string): string {
  const safeQuestion = (question ?? "").trim().toLowerCase();
  const safeTitle = (firstPartTitle ?? "").trim().toLowerCase();
  return `${safeQuestion}::${safeTitle}`;
}

// Reliability: every journey stores the FULL lesson (content + quizzes +
// sources), so an unbounded list eventually blows the ~5 MB localStorage
// quota — at which point persist writes start throwing and history silently
// stops updating. Keep the newest N journeys.
const MAX_SAVED_JOURNEYS = 40;

export const useSavedJourneysStore = create<SavedJourneysStore>()(
  persist(
    (set) => ({
      journeys: [],
      saveJourney: (journey) =>
        set((state) => {
          // Upsert by stable id so re-completing the same lesson updates the
          // existing entry instead of creating duplicates on every reload.
          const existingIndex = state.journeys.findIndex((j) => j.id === journey.id);
          const journeys = (
            existingIndex >= 0
              ? state.journeys.map((j, i) => (i === existingIndex ? journey : j))
              : [journey, ...state.journeys]
          ).slice(0, MAX_SAVED_JOURNEYS);
          journeyLog("saveJourney", {
            id: journey.id,
            upserted: existingIndex >= 0,
            total: journeys.length,
          });
          return { journeys };
        }),
      removeJourney: (id) =>
        set((state) => {
          journeyLog("removeJourney", { id });
          return { journeys: state.journeys.filter((j) => j.id !== id) };
        }),
    }),
    {
      name: "reallearn-saved-journeys",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
