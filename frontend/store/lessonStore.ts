"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createScopedStorage } from "@/lib/userScopedStorage";
import { getArchivedLesson } from "@/lib/lessonArchive";
import { journeySignature } from "@/store/savedJourneysStore";
import { LessonJourney } from "@/types";

interface LessonStore {
  question: string;
  lesson: LessonJourney | null;
  /**
   * True while the persisted active lesson's BODY is being reloaded from the
   * IndexedDB archive after rehydration (only metadata lives in localStorage
   * — see partialize). /learn shows its skeleton shell during this window.
   */
  hydratingLesson: boolean;
  /**
   * Persistence-internal: the tiny metadata slice of the active lesson that
   * IS persisted (see partialize). Only meaningful right after rehydration,
   * when it drives the archive lookup that restores `lesson`.
   */
  lessonMeta: PersistedLessonMeta | null;
  isLoading: boolean;
  error: string | null;
  progressStage: string;
  progressPercent: number;
  /**
   * Backend-driven "taking longer than expected" signal. Set ONLY when the
   * server has actually engaged the resilient (Cloudflare) tier or measured a
   * genuine generation delay — never as a client-side timer guess. Drives the
   * loading screen's reassurance banner.
   */
  notice: "resilient-tier" | "slow" | null;
  /**
   * Hints from the backend's first SSE `meta` event about the lesson shape
   * (mode, expected part count). Drives the optimistic skeleton on /learn.
   */
  expectedParts: number | null;
  unlockedPart: number;
  completedParts: number[];
  partScores: Record<number, number | null>;
  collapsedParts: number[];
  showCompletion: boolean;
  showFollowUp: boolean;
  setQuestion: (question: string) => void;
  startLoading: () => void;
  setProgress: (stage: string, percent: number) => void;
  setNotice: (notice: "resilient-tier" | "slow" | null) => void;
  setMeta: (meta: { expectedParts?: number; mode?: string }) => void;
  setLesson: (lesson: LessonJourney) => void;
  setError: (error: string | null) => void;
  passPart: (part: number, score: number) => void;
  togglePartCollapse: (part: number) => void;
  resetForNextQuestion: (question: string) => void;
  resetAll: () => void;
  resetProgress: () => void;
  loadJourney: (journey: { question: string; lesson: LessonJourney; unlockedPart: number; completedParts: number[]; partScores: Record<number, number | null> }) => void;
}

/**
 * The tiny slice of a lesson that localStorage keeps. Just enough to
 * recompute the saved-journey/archive id so the full body can be reloaded
 * from IndexedDB on the next visit — persisting the multi-KB body itself
 * meant re-stringifying it on every quiz click AND duplicating what
 * lib/lessonArchive already stores.
 */
interface PersistedLessonMeta {
  lessonId?: string;
  question?: string;
  topic?: string;
  firstPartTitle?: string;
}

type PersistedLessonState = Pick<
  LessonStore,
  | "question"
  | "lessonMeta"
  | "unlockedPart"
  | "completedParts"
  | "partScores"
  | "collapsedParts"
  | "showCompletion"
  | "showFollowUp"
> & {
  /** Pre-v1 payloads persisted the full lesson body inline. */
  lesson?: LessonJourney | null;
};

function toLessonMeta(lesson: LessonJourney | null): PersistedLessonMeta | null {
  if (!lesson) return null;
  return {
    lessonId: lesson.lessonId,
    question: lesson.question,
    topic: lesson.topic,
    firstPartTitle: lesson.parts?.[0]?.title,
  };
}

/**
 * The saved-journey (and therefore IndexedDB-archive) id for a lesson.
 * Single source of truth shared with app/learn/page.tsx's persist effect —
 * the two MUST stay in sync or rehydration misses the archived body.
 */
export function journeyIdForLesson(meta: PersistedLessonMeta): string {
  const displayQuestion = meta.question ?? meta.topic ?? "";
  const baseId = journeySignature(displayQuestion, meta.firstPartTitle);
  return meta.lessonId ? `${baseId}::${meta.lessonId.slice(0, 8)}` : baseId;
}

function storeLog(action: string, details?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (details === undefined) {
    console.log(`[frontend][lessonStore] ${action}`);
    return;
  }
  console.log(`[frontend][lessonStore] ${action}`, details);
}

/** Unique id for a freshly generated lesson instance. Falls back to a
 * random string when crypto.randomUUID is unavailable (older WebViews). */
function newLessonId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the manual generator
  }
  return `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const initialState = {
  question: "",
  lesson: null,
  hydratingLesson: false,
  lessonMeta: null as PersistedLessonMeta | null,
  isLoading: false,
  error: null,
  progressStage: "",
  progressPercent: 0,
  notice: null as "resilient-tier" | "slow" | null,
  expectedParts: null as number | null,
  unlockedPart: 1,
  completedParts: [] as number[],
  partScores: { 1: null, 2: null, 3: null } as Record<number, number | null>,
  collapsedParts: [] as number[],
  showCompletion: false,
  showFollowUp: false,
};

export const useLessonStore = create<LessonStore>()(
  persist(
    (set) => ({
      ...initialState,
      setQuestion: (question) => {
        storeLog("setQuestion", { questionLength: question.length });
        set({ question });
      },
      startLoading: () => {
        storeLog("startLoading");
        set({
          isLoading: true,
          error: null,
          lesson: null,
          // A user-started generation supersedes any pending archive restore.
          hydratingLesson: false,
          progressStage: "",
          progressPercent: 0,
          notice: null,
          expectedParts: null,
          unlockedPart: 1,
          completedParts: [],
          partScores: { 1: null, 2: null, 3: null },
          collapsedParts: [],
          showCompletion: false,
          showFollowUp: false,
        });
      },
      setProgress: (stage, percent) => {
        storeLog("setProgress", { stage, percent });
        set({ progressStage: stage, progressPercent: percent });
      },
      setNotice: (notice) => {
        storeLog("setNotice", { notice });
        // First real signal wins — resilient-tier is more specific than a bare
        // slow-timer, so a later "slow" must not downgrade it.
        set((state) => (state.notice ? state : { notice }));
      },
      setMeta: (meta) => {
        storeLog("setMeta", meta);
        set((state) => ({
          expectedParts:
            typeof meta.expectedParts === "number" && meta.expectedParts > 0
              ? meta.expectedParts
              : state.expectedParts,
        }));
      },
      setLesson: (lesson) => {
        storeLog("setLesson", {
          questionLength: lesson.question?.length ?? 0,
          partsCount: lesson.parts?.length ?? 0,
          takeawaysCount: lesson.keyTakeaways?.length ?? 0,
        });
        // Stamp every freshly generated lesson with a unique instance id.
        // Engagement credit keys include it, so asking the SAME question again
        // tomorrow yields a new lesson that still earns XP/streak progress,
        // while retaking quizzes on THIS instance stays credit-idempotent.
        if (!lesson.lessonId) {
          lesson = { ...lesson, lessonId: newLessonId() };
        }
        set({
          lesson,
          question: lesson.question ?? lesson.topic ?? "",
          isLoading: false,
          hydratingLesson: false,
          error: null,
          progressStage: "",
          progressPercent: 0,
          notice: null,
          expectedParts: lesson.parts?.length ?? null,
          unlockedPart: 1,
          completedParts: [],
          partScores: { 1: null, 2: null, 3: null },
          collapsedParts: [],
          showCompletion: false,
          showFollowUp: false,
        });
      },
      setError: (error) => {
        storeLog("setError", { error });
        set({ error, isLoading: false, progressStage: "", progressPercent: 0 });
      },
      passPart: (part, score) =>
        set((state) => {
          // Fast-mode lessons have a single part; explanation lessons have 3.
          const totalParts = state.lesson?.parts?.length ?? 3;
          const completedSet = Array.from(new Set([...state.completedParts, part]));
          const nextUnlock = Math.min(part + 1, totalParts);
          const isComplete = completedSet.length >= totalParts;
          storeLog("passPart", {
            part,
            score,
            totalParts,
            completedParts: completedSet,
            nextUnlock,
          });
          return {
            completedParts: completedSet,
            unlockedPart: nextUnlock,
            partScores: { ...state.partScores, [part]: score },
            collapsedParts: Array.from(new Set([...state.collapsedParts, part])),
            showCompletion: isComplete,
            showFollowUp: isComplete,
          };
        }),
      togglePartCollapse: (part) =>
        set((state) => {
          const collapsedParts = state.collapsedParts.includes(part)
            ? state.collapsedParts.filter((p) => p !== part)
            : [...state.collapsedParts, part];
          storeLog("togglePartCollapse", { part, collapsedParts });
          return { collapsedParts };
        }),
      resetForNextQuestion: (question) => {
        storeLog("resetForNextQuestion", { questionLength: question.length });
        set({
          question,
          lesson: null,
          hydratingLesson: false,
          isLoading: false,
          error: null,
          progressStage: "",
          progressPercent: 0,
          notice: null,
          expectedParts: null,
          unlockedPart: 1,
          completedParts: [],
          partScores: { 1: null, 2: null, 3: null },
          collapsedParts: [],
          showCompletion: false,
          showFollowUp: false,
        });
      },
      resetAll: () => {
        storeLog("resetAll");
        set({ ...initialState });
      },
      resetProgress: () => {
        storeLog("resetProgress");
        set((state) => ({
          ...state,
          unlockedPart: 1,
          completedParts: [],
          partScores: { 1: null, 2: null, 3: null },
          collapsedParts: [],
          showCompletion: false,
          showFollowUp: false,
        }));
      },
      loadJourney: (journey) => {
        storeLog("loadJourney", { id: journey.lesson.question, question: journey.question });
        const totalParts = journey.lesson?.parts?.length ?? 3;
        const allPartNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);
        const completedParts = journey.completedParts ?? allPartNumbers;
        const isComplete = completedParts.length >= totalParts;
        const unlockedPart = journey.unlockedPart ?? totalParts;
        set({
          lesson: journey.lesson,
          question: journey.question,
          isLoading: false,
          hydratingLesson: false,
          error: null,
          unlockedPart,
          completedParts,
          // Default like the sibling fields above — a persisted journey missing
          // partScores would otherwise make learn/page.tsx's
          // Object.values(partScores).reduce(...) throw on load.
          partScores: journey.partScores ?? { 1: null, 2: null, 3: null },
          collapsedParts: isComplete ? allPartNumbers : completedParts,
          showCompletion: isComplete,
          showFollowUp: isComplete,
        });
      },
    }),
    {
      name: "reallearn-journey",
      version: 1,
      // Perf: defer serialization + write off the click path (see lib/debouncedStorage).
      storage: createScopedStorage<PersistedLessonState>(),
      // Persist lesson METADATA only: the multi-KB body already lives in the
      // IndexedDB archive (saved by learn/page's persist effect), so writing
      // it here too meant re-stringifying the whole lesson to localStorage on
      // every quiz click. Rehydration restores the body from the archive.
      partialize: (state) => ({
        question: state.question,
        lessonMeta: toLessonMeta(state.lesson),
        unlockedPart: state.unlockedPart,
        completedParts: state.completedParts,
        partScores: state.partScores,
        collapsedParts: state.collapsedParts,
        showCompletion: state.showCompletion,
        showFollowUp: state.showFollowUp,
      }),
      // v0 → v1: legacy payloads carry the full inline `lesson` body. Keep it
      // — merge hydrates it directly (no archive round-trip needed) and the
      // next write converts the entry to the metadata-only shape.
      migrate: (persisted) => persisted as PersistedLessonState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedLessonState>;
        const { lesson: legacyLesson, ...rest } = p;
        return {
          ...current,
          ...rest,
          lesson: legacyLesson ?? null,
          // Body must be fetched from the archive → gate /learn on the
          // skeleton shell so there's no flash of the empty state (and no
          // re-fired "lesson ready" side effects) while it loads.
          hydratingLesson: !legacyLesson && Boolean(p.lessonMeta),
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        // Nothing to restore: no active lesson, or a legacy payload whose
        // full body already hydrated inline.
        if (state.lesson || !state.lessonMeta) return;
        const meta = state.lessonMeta;
        void (async () => {
          const lesson = await getArchivedLesson(journeyIdForLesson(meta));
          // `useLessonStore` is referenced only after the await: module
          // evaluation has finished by then (sync-storage hydration runs
          // during create()), so there is no TDZ hazard.
          const current = useLessonStore.getState();
          // A user action (new generation, opening a journey, reset) may have
          // superseded the restore while the archive read was in flight.
          if (!current.hydratingLesson || current.isLoading || current.lesson) {
            if (current.hydratingLesson) {
              useLessonStore.setState({ hydratingLesson: false });
            }
            return;
          }
          if (lesson) {
            storeLog("rehydrated lesson body from archive", {
              partsCount: lesson.parts?.length ?? 0,
            });
            useLessonStore.setState({ lesson, hydratingLesson: false });
          } else {
            // Archive copy is gone (cleared site data / new device): land on
            // the clean empty state rather than a crashed half-lesson.
            storeLog("archived lesson body missing — clearing active lesson");
            useLessonStore.setState({ ...initialState });
          }
        })();
      },
    }
  )
);
