// lib/achievements.ts
// Pure helpers for the RealLearn engagement system: XP/level maths, streak
// date logic, and the achievement (badge) catalogue with unlock predicates.
//
// Everything here is deterministic and side-effect free so it can be unit
// tested and reused from the store, the UI, and the share card.
//
// NOTE: keep imports type-only — scripts/verify-achievements.mjs loads this
// file in plain Node (type stripping erases them; runtime imports would break).

import type { IconName } from "@/components/shared/icons";

/* ─────────────────────────── XP & Levels ─────────────────────────── */

/**
 * XP required to advance FROM the given level TO the next one.
 * A gently rising curve: 100, 175, 250, 325 … (+75 per level) keeps early
 * wins fast while making higher levels feel earned.
 */
export function xpToNextLevel(level: number): number {
  return 100 + (Math.max(1, level) - 1) * 75;
}

export interface LevelInfo {
  level: number;
  /** XP accumulated inside the current level. */
  intoLevel: number;
  /** XP needed to clear the current level. */
  forNext: number;
  /** 0..1 progress through the current level. */
  progress: number;
  /** Total lifetime XP. */
  totalXp: number;
}

/** Resolve a total XP figure into a level + progress breakdown. */
export function levelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  let remaining = xp;
  let need = xpToNextLevel(level);
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = xpToNextLevel(level);
  }
  return {
    level,
    intoLevel: remaining,
    forNext: need,
    progress: need > 0 ? remaining / need : 0,
    totalXp: xp,
  };
}

/** A friendly title for a level band — pure flavour, drives pride.
 * Gaming-native ranks: an identity ladder you'd actually flex on a share
 * card, not a dusty RPG guild ("Apprentice… Sage"). */
export function levelTitle(level: number): string {
  if (level >= 30) return "Final Boss";
  if (level >= 20) return "Main Character";
  if (level >= 14) return "Big Brain";
  if (level >= 9) return "Locked In";
  if (level >= 5) return "On the Grind";
  if (level >= 3) return "Explorer";
  return "Fresh Spawn";
}

/* ─────────────────────────── XP awards ─────────────────────────── */

/** XP for passing one part's quiz. `score` = correct answers in that part.
 * Deliberately modest so a single journey is a small step, not a huge jump. */
export function xpForPart(score: number): number {
  return 5 + Math.max(0, score) * 5;
}

/** Bonus XP for finishing a whole 3-part journey. */
export function xpForLessonComplete(totalScore: number, maxScore = 6): number {
  const base = 10;
  const perfect = totalScore >= maxScore ? 15 : 0;
  return base + perfect;
}

/** A small streak kicker applied on lesson completion (capped so it stays sane). */
export function xpForStreak(streak: number): number {
  return Math.min(15, Math.max(0, streak - 1) * 3);
}

/* ─────────────────────────── Dates & streaks ─────────────────────────── */

/** Local calendar day key, e.g. "2026-07-01". Local — matches the user's day. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole-day difference (a - b) between two "YYYY-MM-DD" keys. */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  const ms = da.getTime() - db.getTime();
  return Math.round(ms / 86_400_000);
}

export interface StreakResolution {
  streak: number;
  freezesUsed: number;
  /** True when this activity extended (or started) the streak today. */
  advanced: boolean;
  /** True when the streak was broken and reset to 1. */
  broken: boolean;
}

/**
 * Given the last active day, current streak, and freeze count, resolve the new
 * streak state for activity happening on `today`.
 *
 * - Same day  → no change (already counted).
 * - Yesterday → +1.
 * - Exactly one missed day (gap of 2) → consume a freeze if available
 *   (streak survives and advances), else reset.
 * - Bigger gap → reset to 1.
 */
export function resolveStreak(
  lastActiveDay: string | null,
  currentStreak: number,
  freezes: number,
  today: string
): StreakResolution {
  if (!lastActiveDay) {
    return { streak: 1, freezesUsed: 0, advanced: true, broken: false };
  }
  const gap = daysBetween(today, lastActiveDay);
  if (gap <= 0) {
    // Same day (or clock skew) — already counted.
    return { streak: Math.max(1, currentStreak), freezesUsed: 0, advanced: false, broken: false };
  }
  if (gap === 1) {
    return { streak: currentStreak + 1, freezesUsed: 0, advanced: true, broken: false };
  }
  // A gap of 2 means exactly one day was missed — a freeze can save it.
  if (gap === 2 && freezes > 0) {
    return { streak: currentStreak + 1, freezesUsed: 1, advanced: true, broken: false };
  }
  return { streak: 1, freezesUsed: 0, advanced: true, broken: true };
}

/**
 * The persisted `streak` only changes when a part is passed, so a lapsed
 * streak would otherwise display as "alive" forever. Every surface that shows
 * the streak (navbar hub, home strip, progress dashboard) must render it
 * through this: alive when the last activity was today/yesterday, or exactly
 * one missed day with a freeze in the bank — dead (0) otherwise.
 */
export function displayableStreak(
  streak: number,
  lastActiveDay: string | null,
  freezes: number,
  today: string = dayKey()
): number {
  if (!lastActiveDay) return 0;
  const gap = daysBetween(today, lastActiveDay);
  return gap <= 1 || (gap === 2 && freezes > 0) ? streak : 0;
}

/* ─────────────────────────── Achievements ─────────────────────────── */

export type BadgeTier = "bronze" | "silver" | "gold" | "legendary";

/** The snapshot a badge predicate is evaluated against. */
export interface ProgressSnapshot {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lessonsCompleted: number;
  partsPassed: number;
  perfectParts: number;
  perfectLessons: number;
  languagesUsed: string[];
  subjectsSeen: string[];
  followUps: number;
  dailyGoalsMet: number;
  /** Hour (0-23) of the most recent activity — powers time-of-day badges. */
  lastActivityHour: number | null;
}

export interface Badge {
  id: string;
  /** Name of the inline-SVG icon shown on the badge tile and celebrations. */
  icon: IconName;
  title: string;
  description: string;
  /**
   * Friendly, actionable guidance shown in the hover/tap tooltip — exactly
   * WHAT to do to earn the badge, written like a gentle mentor's hint.
   */
  how: string;
  tier: BadgeTier;
  /** How much of the requirement is complete (0..1) — powers "almost there". */
  progress: (s: ProgressSnapshot) => number;
  earned: (s: ProgressSnapshot) => boolean;
}

function ratio(value: number, target: number): number {
  if (target <= 0) return 1;
  return Math.max(0, Math.min(1, value / target));
}

export const BADGES: Badge[] = [
  /* ── Gentle first wins & Easy effort (Bronze) ── */
  {
    id: "first_spark",
    icon: "leaf",
    title: "First W",
    description: "Pass your very first quiz part.",
    how: "Ask any question you're curious about, read Part 1, and pass its little quiz. That's it — your journey begins.",
    tier: "bronze",
    progress: (s) => ratio(s.partsPassed, 1),
    earned: (s) => s.partsPassed >= 1,
  },
  {
    id: "first_lesson",
    icon: "graduation-cap",
    title: "Tutorial Complete",
    description: "Complete your very first learning journey.",
    how: "Finish all the parts of one lesson — read each part and take its quick check.",
    tier: "bronze",
    progress: (s) => ratio(s.lessonsCompleted, 1),
    earned: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: "first_wonder",
    icon: "message-circle",
    title: "Rabbit Hole Opened",
    description: "Ask your first follow-up question.",
    how: "After finishing a lesson, tap the follow-up box and ask anything the lesson made you wonder about.",
    tier: "bronze",
    progress: (s) => ratio(s.followUps, 1),
    earned: (s) => s.followUps >= 1,
  },
  {
    id: "day_one_done",
    icon: "sun",
    title: "Day One Done",
    description: "Meet your daily goal for the first time.",
    how: "Pass enough quiz parts today to fill your daily goal ring (you can adjust the goal in Settings).",
    tier: "bronze",
    progress: (s) => ratio(s.dailyGoalsMet, 1),
    earned: (s) => s.dailyGoalsMet >= 1,
  },
  {
    id: "level_2",
    icon: "sparkle",
    title: "Level Up",
    description: "Reach Level 2.",
    how: "Earn 100 XP by passing quizzes and completing journeys — one or two lessons will get you there.",
    tier: "bronze",
    progress: (s) => ratio(s.level, 2),
    earned: (s) => s.level >= 2,
  },
  {
    id: "streak_2",
    icon: "calendar",
    title: "Back-to-Back",
    description: "Learn on 2 days in a row.",
    how: "Meet your daily goal today, then pull up again tomorrow. Two days back-to-back starts the run.",
    tier: "bronze",
    progress: (s) => ratio(s.longestStreak, 2),
    earned: (s) => s.longestStreak >= 2,
  },
  {
    id: "branching_out",
    icon: "compass",
    title: "Side Quest",
    description: "Explore 2 different subjects.",
    how: "Ask questions from two different worlds — maybe one about physics, then one about history.",
    tier: "bronze",
    progress: (s) => ratio(s.subjectsSeen.length, 2),
    earned: (s) => s.subjectsSeen.length >= 2,
  },
  {
    id: "first_perfect_part",
    icon: "medal",
    title: "Flawless",
    description: "Ace a quiz with a perfect part score.",
    how: "Read a part carefully, then answer every question in its quiz correctly on your first try.",
    tier: "bronze",
    progress: (s) => ratio(s.perfectParts, 1),
    earned: (s) => s.perfectParts >= 1,
  },
  {
    id: "night_owl",
    icon: "moon",
    title: "Night Owl",
    description: "Learn something after midnight.",
    how: "Pass a quiz part between midnight and 5am — for the 3am search-history hours.",
    tier: "bronze",
    progress: (s) => (s.lastActivityHour !== null && s.lastActivityHour < 5 ? 1 : 0),
    earned: (s) => s.lastActivityHour !== null && s.lastActivityHour >= 0 && s.lastActivityHour < 5,
  },
  {
    id: "early_bird",
    icon: "feather",
    title: "Early Bird",
    description: "Learn something before 8am.",
    how: "Pass a quiz part between 5am and 8am — start the day with something new in your head.",
    tier: "bronze",
    progress: (s) => (s.lastActivityHour !== null && s.lastActivityHour >= 5 && s.lastActivityHour < 8 ? 1 : 0),
    earned: (s) => s.lastActivityHour !== null && s.lastActivityHour >= 5 && s.lastActivityHour < 8,
  },
  {
    id: "late_night_grind",
    icon: "clock",
    title: "Late Night Shift",
    description: "Pass a quiz between 10 PM and midnight.",
    how: "Pass a quiz part between 10 PM and midnight (22:00–23:59). Finishing the day strong.",
    tier: "bronze",
    progress: (s) => (s.lastActivityHour !== null && s.lastActivityHour >= 22 && s.lastActivityHour < 24 ? 1 : 0),
    earned: (s) => s.lastActivityHour !== null && s.lastActivityHour >= 22 && s.lastActivityHour < 24,
  },
  {
    id: "streak_3",
    icon: "flame",
    title: "It's a Streak Now",
    description: "Keep a 3-day learning streak.",
    how: "Meet your daily goal three days in a row. A streak freeze will protect you if you miss one day.",
    tier: "bronze",
    progress: (s) => ratio(s.longestStreak, 3),
    earned: (s) => s.longestStreak >= 3,
  },
  {
    id: "streak_5",
    icon: "zap",
    title: "Five-Day Pulse",
    description: "Keep a 5-day learning streak.",
    how: "Hit your daily goal 5 days in a row. You're building a real habit now.",
    tier: "bronze",
    progress: (s) => ratio(s.longestStreak, 5),
    earned: (s) => s.longestStreak >= 5,
  },

  /* ── Silver — habits taking root & steady effort ── */
  {
    id: "ten_parts",
    icon: "clipboard-check",
    title: "Quiz Boss",
    description: "Pass 10 quiz parts.",
    how: "Keep passing part quizzes across any lessons — every part counts toward the ten.",
    tier: "silver",
    progress: (s) => ratio(s.partsPassed, 10),
    earned: (s) => s.partsPassed >= 10,
  },
  {
    id: "quarter_century_parts",
    icon: "layers",
    title: "Quarter Century",
    description: "Pass 25 quiz parts.",
    how: "Pass 25 part quizzes across your journeys. Every single step counts.",
    tier: "silver",
    progress: (s) => ratio(s.partsPassed, 25),
    earned: (s) => s.partsPassed >= 25,
  },
  {
    id: "five_lessons",
    icon: "book-open",
    title: "Binge Learner",
    description: "Complete 5 learning journeys.",
    how: "Finish five full lessons on anything you like — one more episode, but it's knowledge.",
    tier: "silver",
    progress: (s) => ratio(s.lessonsCompleted, 5),
    earned: (s) => s.lessonsCompleted >= 5,
  },
  {
    id: "ten_lessons",
    icon: "infinity",
    title: "Deep Diver",
    description: "Complete 10 learning journeys.",
    how: "Ten finished journeys — keep asking, keep reading, keep passing those quizzes.",
    tier: "silver",
    progress: (s) => ratio(s.lessonsCompleted, 10),
    earned: (s) => s.lessonsCompleted >= 10,
  },
  {
    id: "xp_500",
    icon: "lightbulb",
    title: "XP Farmer",
    description: "Gather 500 lifetime XP.",
    how: "Every quiz passed and journey finished drops XP. Farm it honestly — 500 lifetime and it's yours.",
    tier: "silver",
    progress: (s) => ratio(s.xp, 500),
    earned: (s) => s.xp >= 500,
  },
  {
    id: "xp_2500",
    icon: "gem",
    title: "XP Collector",
    description: "Gather 2,500 lifetime XP.",
    how: "Stack up 2,500 XP through quizzes, streak bonuses, and completed journeys.",
    tier: "silver",
    progress: (s) => ratio(s.xp, 2500),
    earned: (s) => s.xp >= 2500,
  },
  {
    id: "streak_7",
    icon: "flame",
    title: "On Fire",
    description: "Keep a 7-day learning streak.",
    how: "Meet your daily goal every day for a week. Even one part a day keeps the flame alive.",
    tier: "silver",
    progress: (s) => ratio(s.longestStreak, 7),
    earned: (s) => s.longestStreak >= 7,
  },
  {
    id: "polyglot_2",
    icon: "globe",
    title: "Bilingual Brain",
    description: "Learn in 2 different languages.",
    how: "Switch the lesson language (from the home screen selector) and complete a part in a second language.",
    tier: "silver",
    progress: (s) => ratio(s.languagesUsed.length, 2),
    earned: (s) => s.languagesUsed.length >= 2,
  },
  {
    id: "hyperglot_5",
    icon: "compass",
    title: "Language Explorer",
    description: "Learn in 5 different languages.",
    how: "Try out RealLearn in 5 of the 12 supported languages across your quizzes.",
    tier: "silver",
    progress: (s) => ratio(s.languagesUsed.length, 5),
    earned: (s) => s.languagesUsed.length >= 5,
  },
  {
    id: "level_5",
    icon: "star",
    title: "Built Different",
    description: "Reach Level 5.",
    how: "Keep earning XP from quizzes, perfect parts and finished journeys until Level 5 lights up.",
    tier: "silver",
    progress: (s) => ratio(s.level, 5),
    earned: (s) => s.level >= 5,
  },
  {
    id: "curious_cat",
    icon: "message-circle",
    title: "Terminally Curious",
    description: "Ask 5 follow-up questions.",
    how: "After lessons, hit the follow-up box whenever something bugs you. Five follow-ups and it's official.",
    tier: "silver",
    progress: (s) => ratio(s.followUps, 5),
    earned: (s) => s.followUps >= 5,
  },
  {
    id: "curious_scholar",
    icon: "search",
    title: "Curious Scholar",
    description: "Ask 10 follow-up questions.",
    how: "Ask 10 follow-up questions after finishing lessons. Dig deeper into the details.",
    tier: "silver",
    progress: (s) => ratio(s.followUps, 10),
    earned: (s) => s.followUps >= 10,
  },
  {
    id: "goal_getter",
    icon: "target",
    title: "Goal Getter",
    description: "Hit your daily goal 5 times.",
    how: "Fill your daily goal ring on five different days — they don't have to be in a row.",
    tier: "silver",
    progress: (s) => ratio(s.dailyGoalsMet, 5),
    earned: (s) => s.dailyGoalsMet >= 5,
  },
  {
    id: "flawless_hat_trick",
    icon: "crown",
    title: "Hat-Trick",
    description: "Ace 3 quiz parts with perfect scores.",
    how: "Get 100% on 3 different quiz parts on your very first try.",
    tier: "silver",
    progress: (s) => ratio(s.perfectParts, 3),
    earned: (s) => s.perfectParts >= 3,
  },

  /* ── Gold — real dedication & medium/high milestones ── */
  {
    id: "perfect_lesson",
    icon: "trophy",
    title: "Perfect Run",
    description: "Finish a journey with a perfect score.",
    how: "Complete every part of one lesson without missing a single quiz answer. Read closely — you've got this.",
    tier: "gold",
    progress: (s) => ratio(s.perfectLessons, 1),
    earned: (s) => s.perfectLessons >= 1,
  },
  {
    id: "flawless_five",
    icon: "star-solid",
    title: "Flawless Streak",
    description: "Finish 5 journeys with a 100% perfect score.",
    how: "Complete 5 whole lessons without a single incorrect quiz answer.",
    tier: "gold",
    progress: (s) => ratio(s.perfectLessons, 5),
    earned: (s) => s.perfectLessons >= 5,
  },
  {
    id: "sharpshooter",
    icon: "target",
    title: "Sharpshooter",
    description: "Ace 5 quiz parts with perfect scores.",
    how: "Score perfectly on five part quizzes (any lessons). Careful reading beats fast clicking.",
    tier: "gold",
    progress: (s) => ratio(s.perfectParts, 5),
    earned: (s) => s.perfectParts >= 5,
  },
  {
    id: "fifty_parts",
    icon: "mountain",
    title: "Half-Century",
    description: "Pass 50 quiz parts.",
    how: "Fifty quizzes cleared. You're building a serious foundation of knowledge.",
    tier: "gold",
    progress: (s) => ratio(s.partsPassed, 50),
    earned: (s) => s.partsPassed >= 50,
  },
  {
    id: "twenty_lessons",
    icon: "lightbulb",
    title: "Walking Wikipedia",
    description: "Complete 20 learning journeys.",
    how: "Twenty finished journeys. At this point the questions come to you — keep following them.",
    tier: "gold",
    progress: (s) => ratio(s.lessonsCompleted, 20),
    earned: (s) => s.lessonsCompleted >= 20,
  },
  {
    id: "knowledge_seeker",
    icon: "book-open",
    title: "Knowledge Seeker",
    description: "Complete 35 learning journeys.",
    how: "Complete 35 entire 3-part lessons across any subjects.",
    tier: "gold",
    progress: (s) => ratio(s.lessonsCompleted, 35),
    earned: (s) => s.lessonsCompleted >= 35,
  },
  {
    id: "streak_14",
    icon: "moon",
    title: "Two Weeks, No Misses",
    description: "Keep a 14-day learning streak.",
    how: "Meet your daily goal every day for two weeks straight. Small steps, every single day.",
    tier: "gold",
    progress: (s) => ratio(s.longestStreak, 14),
    earned: (s) => s.longestStreak >= 14,
  },
  {
    id: "streak_21",
    icon: "flame",
    title: "Three-Week Titan",
    description: "Keep a 21-day learning streak.",
    how: "Maintain your daily goal streak for 21 days straight (3 full weeks).",
    tier: "gold",
    progress: (s) => ratio(s.longestStreak, 21),
    earned: (s) => s.longestStreak >= 21,
  },
  {
    id: "polyglot_3",
    icon: "map",
    title: "Polyglot",
    description: "Learn in 3 different languages.",
    how: "Complete parts in three different languages — RealLearn speaks twelve; try a new one.",
    tier: "gold",
    progress: (s) => ratio(s.languagesUsed.length, 3),
    earned: (s) => s.languagesUsed.length >= 3,
  },
  {
    id: "linguist_8",
    icon: "message-circle",
    title: "Linguistic Prodigy",
    description: "Learn in 8 different languages.",
    how: "Complete quiz parts across 8 different Indian languages.",
    tier: "gold",
    progress: (s) => ratio(s.languagesUsed.length, 8),
    earned: (s) => s.languagesUsed.length >= 8,
  },
  {
    id: "level_10",
    icon: "rocket",
    title: "Cracked",
    description: "Reach Level 10.",
    how: "Keep the XP flowing — daily goals, perfect parts and finished journeys all push you upward.",
    tier: "gold",
    progress: (s) => ratio(s.level, 10),
    earned: (s) => s.level >= 10,
  },
  {
    id: "level_15",
    icon: "zap",
    title: "Big Brain Era",
    description: "Reach Level 15.",
    how: "Climb the levels through steady learning until you hit Level 15.",
    tier: "gold",
    progress: (s) => ratio(s.level, 15),
    earned: (s) => s.level >= 15,
  },
  {
    id: "renaissance",
    icon: "layers",
    title: "Genre Hopper",
    description: "Explore 5 different subjects.",
    how: "Wander widely: ask questions across five subjects — science, history, economics, anything.",
    tier: "gold",
    progress: (s) => ratio(s.subjectsSeen.length, 5),
    earned: (s) => s.subjectsSeen.length >= 5,
  },
  {
    id: "subject_master",
    icon: "sparkle",
    title: "Polymath in Training",
    description: "Explore 8 different subjects.",
    how: "Ask questions across 8 distinct academic or real-world subject domains.",
    tier: "gold",
    progress: (s) => ratio(s.subjectsSeen.length, 8),
    earned: (s) => s.subjectsSeen.length >= 8,
  },
  {
    id: "habit_builder",
    icon: "calendar",
    title: "Habit Builder",
    description: "Hit your daily goal 20 times.",
    how: "Twenty days of met goals, in any pattern. That's not motivation anymore, that's a system.",
    tier: "gold",
    progress: (s) => ratio(s.dailyGoalsMet, 20),
    earned: (s) => s.dailyGoalsMet >= 20,
  },
  {
    id: "goal_crusher",
    icon: "clipboard-check",
    title: "Goal Crusher",
    description: "Hit your daily goal 50 times.",
    how: "Meet your daily learning goal on 50 separate calendar days.",
    tier: "gold",
    progress: (s) => ratio(s.dailyGoalsMet, 50),
    earned: (s) => s.dailyGoalsMet >= 50,
  },
  {
    id: "endless_wonder",
    icon: "feather",
    title: "Thread Puller",
    description: "Ask 15 follow-up questions.",
    how: "Keep pulling the thread after each lesson — fifteen follow-ups deep is a proper rabbit hole.",
    tier: "gold",
    progress: (s) => ratio(s.followUps, 15),
    earned: (s) => s.followUps >= 15,
  },

  /* ── Legendary — impossibly high feats & ultra grind ── */
  {
    id: "streak_30",
    icon: "star-solid",
    title: "Unstoppable",
    description: "Keep a 30-day learning streak.",
    how: "A whole month of met daily goals. Guard your streak freezes with your life.",
    tier: "legendary",
    progress: (s) => ratio(s.longestStreak, 30),
    earned: (s) => s.longestStreak >= 30,
  },
  {
    id: "streak_100",
    icon: "crown",
    title: "Centurion Flame",
    description: "Keep a 100-day learning streak.",
    how: "Maintain a 100-day learning streak without losing your flame. Legendary!",
    tier: "legendary",
    progress: (s) => ratio(s.longestStreak, 100),
    earned: (s) => s.longestStreak >= 100,
  },
  {
    id: "grand_library",
    icon: "graduation-cap",
    title: "Lore Master",
    description: "Complete 50 learning journeys.",
    how: "Fifty finished journeys. At this point you ARE the group chat's fact-checker.",
    tier: "legendary",
    progress: (s) => ratio(s.lessonsCompleted, 50),
    earned: (s) => s.lessonsCompleted >= 50,
  },
  {
    id: "century_club",
    icon: "trophy",
    title: "Century Club",
    description: "Complete 100 learning journeys.",
    how: "Complete 100 full 3-part lessons. A monumental feat of intellect.",
    tier: "legendary",
    progress: (s) => ratio(s.lessonsCompleted, 100),
    earned: (s) => s.lessonsCompleted >= 100,
  },
  {
    id: "two_hundred_parts",
    icon: "shield",
    title: "Quiz Sovereign",
    description: "Pass 200 quiz parts.",
    how: "Pass 200 individual part quizzes. Truly legendary dedication.",
    tier: "legendary",
    progress: (s) => ratio(s.partsPassed, 200),
    earned: (s) => s.partsPassed >= 200,
  },
  {
    id: "xp_10000",
    icon: "gem",
    title: "XP Overlord",
    description: "Gather 10,000 lifetime XP.",
    how: "Amass a staggering 10,000 total lifetime XP across all activity.",
    tier: "legendary",
    progress: (s) => ratio(s.xp, 10000),
    earned: (s) => s.xp >= 10000,
  },
  {
    id: "level_20",
    icon: "mountain",
    title: "Final Form",
    description: "Reach Level 20.",
    how: "The long road: keep showing up daily and let the XP stack. Level 20 is earned, never given.",
    tier: "legendary",
    progress: (s) => ratio(s.level, 20),
    earned: (s) => s.level >= 20,
  },
  {
    id: "level_30",
    icon: "gamepad",
    title: "Final Boss",
    description: "Reach Level 30.",
    how: "Reach the ultimate rank — Level 30. You are the Final Boss.",
    tier: "legendary",
    progress: (s) => ratio(s.level, 30),
    earned: (s) => s.level >= 30,
  },
  {
    id: "omniglot",
    icon: "globe",
    title: "Omniglot",
    description: "Learn in all 12 supported languages.",
    how: "Complete at least one quiz part in every single language RealLearn supports (12 languages!).",
    tier: "legendary",
    progress: (s) => ratio(s.languagesUsed.length, 12),
    earned: (s) => s.languagesUsed.length >= 12,
  },
  {
    id: "deadeye",
    icon: "target",
    title: "Deadeye Specialist",
    description: "Ace 50 quiz parts with perfect scores.",
    how: "Score 100% on 50 part quizzes on your first try. Flawless precision.",
    tier: "legendary",
    progress: (s) => ratio(s.perfectParts, 50),
    earned: (s) => s.perfectParts >= 50,
  },
  {
    id: "perfectionist_prime",
    icon: "medal",
    title: "Perfectionist Prime",
    description: "Finish 20 journeys with 100% perfect scores.",
    how: "Complete 20 entire lessons without missing a single quiz question.",
    tier: "legendary",
    progress: (s) => ratio(s.perfectLessons, 20),
    earned: (s) => s.perfectLessons >= 20,
  },
  {
    id: "hundred_goals",
    icon: "infinity",
    title: "Century of Goals",
    description: "Hit your daily goal 100 times.",
    how: "Meet your daily learning goal on 100 distinct days. Unwavering discipline.",
    tier: "legendary",
    progress: (s) => ratio(s.dailyGoalsMet, 100),
    earned: (s) => s.dailyGoalsMet >= 100,
  },
];

export const BADGE_BY_ID: Record<string, Badge> = BADGES.reduce(
  (acc, b) => {
    acc[b.id] = b;
    return acc;
  },
  {} as Record<string, Badge>
);

// Theme-aware via the --tier-* tokens in globals.css: the raw hexes here
// failed WCAG AA as text on light backgrounds (and "gold" wore a banned gold
// hue). Consumers only use these in DOM styles, so CSS vars resolve per theme.
export const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: "var(--tier-bronze)",
  silver: "var(--tier-silver)",
  gold: "var(--tier-gold)",
  // legendary outranks gold in the brand's own voice: lime-olive
  legendary: "var(--tier-legendary)",
};
