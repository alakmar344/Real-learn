"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDebouncedStorage } from "@/lib/debouncedStorage";
import { LessonJourney } from "@/types";

interface LessonStore {
  question: string;
  lesson: LessonJourney | null;
  isLoading: boolean;
  error: string | null;
  progressStage: string;
  progressPercent: number;
  unlockedPart: number;
  completedParts: number[];
  partScores: Record<number, number | null>;
  collapsedParts: number[];
  showCompletion: boolean;
  showFollowUp: boolean;
  setQuestion: (question: string) => void;
  startLoading: () => void;
  setProgress: (stage: string, percent: number) => void;
  setLesson: (lesson: LessonJourney) => void;
  setError: (error: string | null) => void;
  passPart: (part: number, score: number) => void;
  togglePartCollapse: (part: number) => void;
  resetForNextQuestion: (question: string) => void;
  resetAll: () => void;
  resetProgress: () => void;
  loadJourney: (journey: { question: string; lesson: LessonJourney; unlockedPart: number; completedParts: number[]; partScores: Record<number, number | null> }) => void;
}

type PersistedLessonState = Pick<
  LessonStore,
  | "question"
  | "lesson"
  | "unlockedPart"
  | "completedParts"
  | "partScores"
  | "collapsedParts"
  | "showCompletion"
  | "showFollowUp"
>;

function storeLog(action: string, details?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (details === undefined) {
    console.log(`[frontend][lessonStore] ${action}`);
    return;
  }
  console.log(`[frontend][lessonStore] ${action}`, details);
}

const initialState = {
  question: "",
  lesson: null,
  isLoading: false,
  error: null,
  progressStage: "",
  progressPercent: 0,
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
          progressStage: "",
          progressPercent: 0,
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
      setLesson: (lesson) => {
        storeLog("setLesson", {
          questionLength: lesson.question?.length ?? 0,
          partsCount: lesson.parts?.length ?? 0,
          takeawaysCount: lesson.keyTakeaways?.length ?? 0,
        });
        set({
          lesson,
          question: lesson.question ?? lesson.topic ?? "",
          isLoading: false,
          error: null,
          progressStage: "",
          progressPercent: 0,
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
          isLoading: false,
          error: null,
          progressStage: "",
          progressPercent: 0,
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
      // Perf: defer serialization + write off the click path (see lib/debouncedStorage).
      storage: createDebouncedStorage<PersistedLessonState>(),
      partialize: (state) => ({
        question: state.question,
        lesson: state.lesson,
        unlockedPart: state.unlockedPart,
        completedParts: state.completedParts,
        partScores: state.partScores,
        collapsedParts: state.collapsedParts,
        showCompletion: state.showCompletion,
        showFollowUp: state.showFollowUp,
      }),
    }
  )
);
