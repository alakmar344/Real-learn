"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  BADGES,
  ProgressSnapshot,
  dayKey,
  levelInfo,
  resolveStreak,
  xpForLessonComplete,
  xpForPart,
  xpForStreak,
} from "@/lib/achievements";

/* ─────────────────────────── Celebrations ─────────────────────────── */

export type Celebration =
  | { kind: "xp"; amount: number; reason: string }
  | { kind: "level-up"; level: number }
  | { kind: "badge"; badgeId: string }
  | { kind: "streak"; streak: number }
  | { kind: "daily-goal"; goal: number };

/* ─────────────────────────── State ─────────────────────────── */

interface ProgressState {
  xp: number;
  streak: number;
  longestStreak: number;
  lastActiveDay: string | null;
  streakFreezes: number;

  dailyGoal: number; // parts per day
  dailyCount: number;
  dailyCountDay: string | null;
  dailyGoalsMet: number;
  dailyGoalMetDay: string | null;

  lessonsCompleted: number;
  partsPassed: number;
  perfectParts: number;
  perfectLessons: number;
  followUps: number;

  languagesUsed: string[];
  subjectsSeen: string[];
  lastActivityHour: number | null;

  /** date key -> number of parts studied that day (activity heatmap). */
  history: Record<string, number>;
  /** unlocked badge id -> unlock timestamp (ms). */
  badges: Record<string, number>;

  /** FIFO queue of celebration events the EngagementLayer renders. */
  celebrations: Celebration[];

  reminderOptIn: boolean;

  // actions
  recordPartPassed: (input: { score: number; maxPerPart?: number; language: string; subject?: string }) => void;
  recordLessonCompleted: (input: { totalScore: number; maxScore?: number; language: string }) => void;
  recordFollowUp: () => void;
  setDailyGoal: (goal: number) => void;
  setReminderOptIn: (value: boolean) => void;
  dequeueCelebration: () => void;
  clearCelebrations: () => void;
  resetEngagement: () => void;
}

function log(action: string, details?: unknown) {
  if (details === undefined) console.log(`[frontend][progressStore] ${action}`);
  else console.log(`[frontend][progressStore] ${action}`, details);
}

function snapshotOf(s: ProgressState): ProgressSnapshot {
  return {
    xp: s.xp,
    level: levelInfo(s.xp).level,
    streak: s.streak,
    longestStreak: s.longestStreak,
    lessonsCompleted: s.lessonsCompleted,
    partsPassed: s.partsPassed,
    perfectParts: s.perfectParts,
    perfectLessons: s.perfectLessons,
    languagesUsed: s.languagesUsed,
    subjectsSeen: s.subjectsSeen,
    followUps: s.followUps,
    dailyGoalsMet: s.dailyGoalsMet,
    lastActivityHour: s.lastActivityHour,
  };
}

/**
 * Given a next-state draft, append any celebrations that should fire relative
 * to the previous snapshot: level-ups and newly earned badges. Mutates the
 * draft's `celebrations`. Returns the same draft for chaining.
 */
function withDerivedCelebrations(
  prev: ProgressState,
  draft: ProgressState,
  extra: Celebration[]
): Celebration[] {
  const out: Celebration[] = [...extra];

  const prevLevel = levelInfo(prev.xp).level;
  const nextLevel = levelInfo(draft.xp).level;
  for (let lvl = prevLevel + 1; lvl <= nextLevel; lvl++) {
    out.push({ kind: "level-up", level: lvl });
  }

  const snap = snapshotOf(draft);
  for (const badge of BADGES) {
    if (!draft.badges[badge.id] && badge.earned(snap)) {
      draft.badges = { ...draft.badges, [badge.id]: Date.now() };
      out.push({ kind: "badge", badgeId: badge.id });
    }
  }
  return out;
}

/** Roll the daily counter over when the calendar day changes. */
function normalizeDaily(s: ProgressState, today: string): { dailyCount: number } {
  if (s.dailyCountDay !== today) return { dailyCount: 0 };
  return { dailyCount: s.dailyCount };
}

const initialEngagement = {
  xp: 0,
  streak: 0,
  longestStreak: 0,
  lastActiveDay: null as string | null,
  streakFreezes: 2,
  dailyGoal: 3,
  dailyCount: 0,
  dailyCountDay: null as string | null,
  dailyGoalsMet: 0,
  dailyGoalMetDay: null as string | null,
  lessonsCompleted: 0,
  partsPassed: 0,
  perfectParts: 0,
  perfectLessons: 0,
  followUps: 0,
  languagesUsed: [] as string[],
  subjectsSeen: [] as string[],
  lastActivityHour: null as number | null,
  history: {} as Record<string, number>,
  badges: {} as Record<string, number>,
  celebrations: [] as Celebration[],
  reminderOptIn: false,
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      ...initialEngagement,

      recordPartPassed: ({ score, maxPerPart = 2, language, subject }) =>
        set((prev) => {
          const now = new Date();
          const today = dayKey(now);
          const hour = now.getHours();
          const gained = xpForPart(score);
          const isPerfect = score >= maxPerPart;

          const { dailyCount: baseDaily } = normalizeDaily(prev, today);
          const nextDailyCount = baseDaily + 1;

          const draft: ProgressState = {
            ...prev,
            xp: prev.xp + gained,
            partsPassed: prev.partsPassed + 1,
            perfectParts: prev.perfectParts + (isPerfect ? 1 : 0),
            lastActivityHour: hour,
            dailyCount: nextDailyCount,
            dailyCountDay: today,
            history: { ...prev.history, [today]: (prev.history[today] ?? 0) + 1 },
            languagesUsed: language && !prev.languagesUsed.includes(language)
              ? [...prev.languagesUsed, language]
              : prev.languagesUsed,
            subjectsSeen: subject && !prev.subjectsSeen.includes(subject)
              ? [...prev.subjectsSeen, subject]
              : prev.subjectsSeen,
          };

          const extra: Celebration[] = [{ kind: "xp", amount: gained, reason: isPerfect ? "Perfect part!" : "Part passed" }];

          // ── Streak is earned by COMPLETING THE DAILY GOAL, not by mere
          //    activity. It advances at most once per day, the moment the
          //    day's target is reached. ──
          const goalReached = nextDailyCount >= draft.dailyGoal;
          const alreadyMetToday = prev.dailyGoalMetDay === today;
          if (goalReached && !alreadyMetToday) {
            const streakRes = resolveStreak(prev.lastActiveDay, prev.streak, prev.streakFreezes, today);
            draft.streak = streakRes.streak;
            draft.longestStreak = Math.max(prev.longestStreak, streakRes.streak);
            draft.streakFreezes = prev.streakFreezes - streakRes.freezesUsed;
            draft.lastActiveDay = today;
            draft.dailyGoalsMet = prev.dailyGoalsMet + 1;
            draft.dailyGoalMetDay = today;
            extra.push({ kind: "daily-goal", goal: draft.dailyGoal });
            extra.push({ kind: "streak", streak: draft.streak });
          }

          const celebrations = withDerivedCelebrations(prev, draft, extra);
          draft.celebrations = [...prev.celebrations, ...celebrations];

          log("recordPartPassed", { gained, score, streak: draft.streak, daily: `${nextDailyCount}/${draft.dailyGoal}`, goalMet: goalReached && !alreadyMetToday });
          return draft;
        }),

      recordLessonCompleted: ({ totalScore, maxScore = 6, language }) =>
        set((prev) => {
          const gained = xpForLessonComplete(totalScore, maxScore) + xpForStreak(prev.streak);
          const isPerfect = totalScore >= maxScore;

          const draft: ProgressState = {
            ...prev,
            xp: prev.xp + gained,
            lessonsCompleted: prev.lessonsCompleted + 1,
            perfectLessons: prev.perfectLessons + (isPerfect ? 1 : 0),
            languagesUsed: language && !prev.languagesUsed.includes(language)
              ? [...prev.languagesUsed, language]
              : prev.languagesUsed,
          };

          const extra: Celebration[] = [
            { kind: "xp", amount: gained, reason: isPerfect ? "Perfect journey!" : "Journey complete" },
          ];
          const celebrations = withDerivedCelebrations(prev, draft, extra);
          draft.celebrations = [...prev.celebrations, ...celebrations];

          log("recordLessonCompleted", { gained, totalScore, lessons: draft.lessonsCompleted });
          return draft;
        }),

      recordFollowUp: () =>
        set((prev) => {
          const draft: ProgressState = { ...prev, followUps: prev.followUps + 1 };
          const celebrations = withDerivedCelebrations(prev, draft, []);
          draft.celebrations = [...prev.celebrations, ...celebrations];
          log("recordFollowUp", { followUps: draft.followUps });
          return draft;
        }),

      setDailyGoal: (goal) =>
        set(() => {
          const clamped = Math.max(1, Math.min(10, Math.round(goal)));
          log("setDailyGoal", { goal: clamped });
          return { dailyGoal: clamped };
        }),

      setReminderOptIn: (value) => {
        log("setReminderOptIn", { value });
        set({ reminderOptIn: value });
      },

      dequeueCelebration: () =>
        set((prev) => ({ celebrations: prev.celebrations.slice(1) })),

      clearCelebrations: () => set({ celebrations: [] }),

      resetEngagement: () => {
        log("resetEngagement");
        set({ ...initialEngagement });
      },
    }),
    {
      name: "reallearn-progress",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Never persist the transient celebration queue.
      partialize: (state) => {
        const { celebrations: _celebrations, ...rest } = state;
        void _celebrations;
        return rest;
      },
    }
  )
);
