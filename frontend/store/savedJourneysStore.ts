"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDebouncedStorage } from "@/lib/debouncedStorage";
import { saveArchivedLesson, deleteArchivedLesson } from "@/lib/lessonArchive";
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

// ── Split storage: index in localStorage, lesson bodies in IndexedDB ────────
// Every journey used to store the FULL lesson (content + quizzes + sources)
// in localStorage, so after many lessons the history became megabytes of JSON
// that was re-serialized on every quiz interaction — the app got slower and
// laggier the more you learned. Since policy v2.4, EVERY chat's heavy lesson
// body lives ONLY in IndexedDB (lib/lessonArchive.ts — large quota, fully
// async, never blocks a render), while this store keeps just a lightweight
// per-chat index entry (question, scores, dates, part/quiz counts). Opening
// any chat is a free async local read — never a paid LLM regeneration, which
// remains the last resort for a genuinely missing copy (cleared site data /
// new device).
export const MAX_SAVED_JOURNEYS = 100;

// PERF: a lesson body is immutable across a session — only progress metadata
// (scores, unlocked/completed parts) changes as the learner passes quizzes.
// The persist effect re-runs saveJourney on EVERY part pass, so without this
// guard the full lesson would be JSON.stringify'd + gzip'd + written to
// IndexedDB 3-6 times per session for content that never changed. Track the
// last-archived lesson reference per id and skip the redundant re-encode; a
// genuinely NEW generation produces a new lesson object reference and is
// re-archived correctly.
const archivedLessonRefs = new Map<string, object>();

/**
 * Condense a journey to its lightweight index entry, stashing the heavy
 * lesson body in the IndexedDB archive so it can be reloaded for free.
 */
function toIndexEntry(journey: SavedJourney): SavedJourney {
  if (journey.archived && !journey.lesson) return journey;
  const parts = journey.lesson?.parts ?? [];
  if (journey.lesson && archivedLessonRefs.get(journey.id) !== journey.lesson) {
    // Fire-and-forget: if the write fails (private mode, quota) the entry
    // still degrades gracefully to regenerate-on-open.
    archivedLessonRefs.set(journey.id, journey.lesson);
    void saveArchivedLesson(journey.id, journey.lesson);
  }
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

/** Move every lesson body to IndexedDB and cap the total list. */
function applyRetention(journeys: SavedJourney[]): SavedJourney[] {
  // Entries pushed past the hard cap leave history entirely — clean up their
  // archived lesson bodies too so IndexedDB doesn't accumulate orphans.
  journeys.slice(MAX_SAVED_JOURNEYS).forEach((j) => {
    void deleteArchivedLesson(j.id);
    archivedLessonRefs.delete(j.id);
  });
  return journeys.slice(0, MAX_SAVED_JOURNEYS).map(toIndexEntry);
}

export const useSavedJourneysStore = create<SavedJourneysStore>()(
  persist(
    (set) => ({
      journeys: [],
      saveJourney: (journey) =>
        set((state) => {
          // Upsert by stable id, moving the entry to the front so the list
          // stays ordered by recency.
          const existingIndex = state.journeys.findIndex((j) => j.id === journey.id);
          const rest =
            existingIndex >= 0
              ? state.journeys.filter((j) => j.id !== journey.id)
              : state.journeys;
          const journeys = applyRetention([journey, ...rest]);
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
          // Also drop the archived lesson body so deletion really deletes.
          void deleteArchivedLesson(id);
          archivedLessonRefs.delete(id);
          return { journeys: state.journeys.filter((j) => j.id !== id) };
        }),
    }),
    {
      name: "reallearn-saved-journeys",
      storage: createDebouncedStorage<Pick<SavedJourneysStore, "journeys">>(),
      partialize: (state) => ({ journeys: state.journeys }),
      version: 2,
      // v0/v1 → v2: move every inline lesson body out of localStorage into
      // the IndexedDB archive on first load. Nothing is deleted — history
      // entries become a lightweight index and their lessons stay reloadable
      // locally for free.
      migrate: (persisted) => {
        const state = persisted as { journeys?: SavedJourney[] } | undefined;
        return {
          journeys: applyRetention(state?.journeys ?? []),
        };
      },
    }
  )
);
