"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDebouncedStorage } from "@/lib/debouncedStorage";
import { SavedJourney } from "@/types";

interface SavedJourneysStore {
  journeys: SavedJourney[];
  saveJourney: (journey: SavedJourney) => void;
  removeJourney: (id: string) => void;
}

function journeyLog(action: string, details?: unknown) {
  if (process.env.NODE_ENV === "production") return;
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

// ── Tiered retention (the "middle way") ─────────────────────────────────────
// Every journey used to store the FULL lesson (content + quizzes + sources)
// forever, so after many lessons the history became megabytes of JSON that was
// re-serialized to localStorage on every quiz interaction — the app got slower
// and laggier the more you learned. Deleting old lessons would lose the user's
// history; keeping everything kept the lag. The middle way:
//   • the newest MAX_FULL_JOURNEYS keep their full lesson (instant re-open),
//   • older entries are CONDENSED to lightweight summaries (question, scores,
//     dates, part/quiz counts) instead of being deleted — re-opening one
//     simply regenerates the lesson (usually served from the server cache),
//   • the total list is still capped well below the ~5 MB localStorage quota.
export const MAX_FULL_JOURNEYS = 12;
export const MAX_SAVED_JOURNEYS = 100;

/** Condense a journey to its lightweight summary (drops the heavy lesson). */
function toArchivedJourney(journey: SavedJourney): SavedJourney {
  if (journey.archived && !journey.lesson) return journey;
  const parts = journey.lesson?.parts ?? [];
  const { lesson: _lesson, ...rest } = journey;
  return {
    ...rest,
    archived: true,
    partCount: journey.partCount ?? (parts.length || undefined),
    quizCount:
      journey.quizCount ??
      (parts.reduce((sum, p) => sum + (p.quiz?.length ?? 0), 0) || undefined),
  };
}

/** Keep the newest N full lessons, archive the rest, cap the total list. */
function applyTieredRetention(journeys: SavedJourney[]): SavedJourney[] {
  let fullKept = 0;
  return journeys.slice(0, MAX_SAVED_JOURNEYS).map((journey) => {
    if (journey.archived || !journey.lesson) return toArchivedJourney(journey);
    fullKept += 1;
    return fullKept <= MAX_FULL_JOURNEYS ? journey : toArchivedJourney(journey);
  });
}

export const useSavedJourneysStore = create<SavedJourneysStore>()(
  persist(
    (set) => ({
      journeys: [],
      saveJourney: (journey) =>
        set((state) => {
          // Upsert by stable id, moving the entry to the front so the list
          // stays ordered by recency (which is what tiered retention keys on).
          const existingIndex = state.journeys.findIndex((j) => j.id === journey.id);
          const rest =
            existingIndex >= 0
              ? state.journeys.filter((j) => j.id !== journey.id)
              : state.journeys;
          const journeys = applyTieredRetention([journey, ...rest]);
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
      storage: createDebouncedStorage<Pick<SavedJourneysStore, "journeys">>(),
      partialize: (state) => ({ journeys: state.journeys }),
      version: 1,
      // v0 → v1: condense pre-existing oversized histories on first load so
      // long-time users get the speedup immediately (their older entries
      // become summaries; nothing is deleted).
      migrate: (persisted) => {
        const state = persisted as { journeys?: SavedJourney[] } | undefined;
        return {
          journeys: applyTieredRetention(state?.journeys ?? []),
        };
      },
    }
  )
);
