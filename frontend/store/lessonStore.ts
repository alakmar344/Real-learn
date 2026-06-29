"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Language, LessonJourney, Level, SavedJourney } from "@/types";

interface LessonStore {
  language: Language;
  level: Level;
  question: string;
  lesson: LessonJourney | null;
  isLoading: boolean;
  error: string | null;
  unlockedPart: 1 | 2 | 3;
  completedParts: number[];
  partScores: Record<1 | 2 | 3, number | null>;
  collapsedParts: number[];
  showCompletion: boolean;
  showFollowUp: boolean;
  setLanguage: (language: Language) => void;
  setLevel: (level: Level) => void;
  setQuestion: (question: string) => void;
  startLoading: () => void;
  setLesson: (lesson: LessonJourney) => void;
  setError: (error: string | null) => void;
  passPart: (part: 1 | 2 | 3, score: number) => void;
  togglePartCollapse: (part: 1 | 2 | 3) => void;
  resetForNextQuestion: (question: string) => void;
  resetAll: () => void;
  resetProgress: () => void;
  loadJourney: (journey: SavedJourney) => void;
}

function storeLog(action: string, details?: unknown) {
  if (details === undefined) {
    console.log(`[frontend][lessonStore] ${action}`);
    return;
  }
  console.log(`[frontend][lessonStore] ${action}`, details);
}

const initialState = {
  language: "English" as Language,
  level: "Class 9-10" as Level,
  question: "",
  lesson: null,
  isLoading: false,
  error: null,
  unlockedPart: 1 as 1 | 2 | 3,
  completedParts: [] as number[],
  partScores: { 1: null, 2: null, 3: null } as Record<1 | 2 | 3, number | null>,
  collapsedParts: [] as number[],
  showCompletion: false,
  showFollowUp: false,
};

export const useLessonStore = create<LessonStore>()(
  persist(
    (set) => ({
      ...initialState,
      setLanguage: (language) => {
        storeLog("setLanguage", { language });
        set({ language });
      },
      setLevel: (level) => {
        storeLog("setLevel", { level });
        set({ level });
      },
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
          unlockedPart: 1,
          completedParts: [],
          partScores: { 1: null, 2: null, 3: null },
          collapsedParts: [],
          showCompletion: false,
          showFollowUp: false,
        });
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
        set({ error, isLoading: false });
      },
      passPart: (part, score) =>
        set((state) => {
          const completedSet = Array.from(new Set([...state.completedParts, part]));
          const nextUnlock = part === 3 ? 3 : ((part + 1) as 1 | 2 | 3);
          storeLog("passPart", {
            part,
            score,
            completedParts: completedSet,
            nextUnlock,
          });
          return {
            completedParts: completedSet,
            unlockedPart: nextUnlock,
            partScores: { ...state.partScores, [part]: score },
            collapsedParts: Array.from(new Set([...state.collapsedParts, part])),
            showCompletion: completedSet.length === 3,
            showFollowUp: completedSet.length === 3,
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
        storeLog("loadJourney", { id: journey.id, question: journey.question });
        set({
          lesson: journey.lesson,
          question: journey.question,
          language: journey.language,
          level: journey.level,
          isLoading: false,
          error: null,
          unlockedPart: 3,
          completedParts: [1, 2, 3],
          partScores: journey.partScores,
          collapsedParts: [1, 2, 3],
          showCompletion: true,
          showFollowUp: true,
        });
      },
    }),
    {
      name: "reallearn-journey",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        level: state.level,
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
