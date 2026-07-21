// lib/achievements.ts
// Pure helpers for the RealLearn engagement system: XP/level maths, streak
// date logic, and the achievement (badge) catalogue with unlock predicates.
//
// Everything here is deterministic and side-effect free so it can be unit
// tested and reused from the store, the UI, and the share card.

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

/** A friendly title for a level band — pure flavour, drives pride. */
export function levelTitle(level: number): string {
  if (level >= 30) return "Sage";
  if (level >= 20) return "Scholar";
  if (level >= 14) return "Polymath";
  if (level >= 9) return "Thinker";
  if (level >= 5) return "Apprentice";
  if (level >= 3) return "Explorer";
  return "Curious";
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
  emoji: string;
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
  /* ── Gentle first wins — earned within minutes of arriving ── */
  {
    id: "first_spark",
    emoji: "🌱",
    title: "First Spark",
    description: "Pass your very first quiz part.",
    how: "Ask any question you're curious about, read Part 1, and pass its little quiz. That's it — your journey begins.",
    tier: "bronze",
    progress: (s) => ratio(s.partsPassed, 1),
    earned: (s) => s.partsPassed >= 1,
  },
  {
    id: "first_lesson",
    emoji: "🎓",
    title: "First Steps",
    description: "Complete your very first learning journey.",
    how: "Finish all the parts of one lesson — read each part and pass its quiz to unlock the next.",
    tier: "bronze",
    progress: (s) => ratio(s.lessonsCompleted, 1),
    earned: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: "first_wonder",
    emoji: "💭",
    title: "First Wonder",
    description: "Ask your first follow-up question.",
    how: "After finishing a lesson, tap the follow-up box and ask anything the lesson made you wonder about.",
    tier: "bronze",
    progress: (s) => ratio(s.followUps, 1),
    earned: (s) => s.followUps >= 1,
  },
  {
    id: "day_one_done",
    emoji: "☀️",
    title: "Day One Done",
    description: "Meet your daily goal for the first time.",
    how: "Pass enough quiz parts today to fill your daily goal ring (you can adjust the goal in Settings).",
    tier: "bronze",
    progress: (s) => ratio(s.dailyGoalsMet, 1),
    earned: (s) => s.dailyGoalsMet >= 1,
  },
  {
    id: "level_2",
    emoji: "✨",
    title: "Getting Brighter",
    description: "Reach Level 2.",
    how: "Earn 100 XP by passing quizzes and completing journeys — one or two lessons will get you there.",
    tier: "bronze",
    progress: (s) => ratio(s.level, 2),
    earned: (s) => s.level >= 2,
  },
  {
    id: "streak_2",
    emoji: "🕯️",
    title: "Two Candles",
    description: "Learn on 2 days in a row.",
    how: "Meet your daily goal today, then come back tomorrow and do it again. Two days, one little flame.",
    tier: "bronze",
    progress: (s) => ratio(s.longestStreak, 2),
    earned: (s) => s.longestStreak >= 2,
  },
  {
    id: "branching_out",
    emoji: "🌿",
    title: "Branching Out",
    description: "Explore 2 different subjects.",
    how: "Ask questions from two different worlds — maybe one about physics, then one about history.",
    tier: "bronze",
    progress: (s) => ratio(s.subjectsSeen.length, 2),
    earned: (s) => s.subjectsSeen.length >= 2,
  },
  {
    id: "first_perfect_part",
    emoji: "💯",
    title: "Flawless",
    description: "Ace a quiz with a perfect part score.",
    how: "Read a part carefully, then answer every question in its quiz correctly on your first try.",
    tier: "bronze",
    progress: (s) => ratio(s.perfectParts, 1),
    earned: (s) => s.perfectParts >= 1,
  },
  {
    id: "night_owl",
    emoji: "🦉",
    title: "Night Owl",
    description: "Learn something after midnight.",
    how: "Pass a quiz part between midnight and 5am — for the quiet hours when curiosity won't sleep.",
    tier: "bronze",
    progress: (s) => (s.lastActivityHour !== null && s.lastActivityHour < 5 ? 1 : 0),
    earned: (s) => s.lastActivityHour !== null && s.lastActivityHour >= 0 && s.lastActivityHour < 5,
  },
  {
    id: "early_bird",
    emoji: "🐦",
    title: "Early Bird",
    description: "Learn something before 8am.",
    how: "Pass a quiz part between 5am and 8am — start the day with something new in your head.",
    tier: "bronze",
    progress: (s) => (s.lastActivityHour !== null && s.lastActivityHour >= 5 && s.lastActivityHour < 8 ? 1 : 0),
    earned: (s) => s.lastActivityHour !== null && s.lastActivityHour >= 5 && s.lastActivityHour < 8,
  },
  {
    id: "streak_3",
    emoji: "🔥",
    title: "Warming Up",
    description: "Keep a 3-day learning streak.",
    how: "Meet your daily goal three days in a row. A streak freeze will protect you if you miss one day.",
    tier: "bronze",
    progress: (s) => ratio(s.longestStreak, 3),
    earned: (s) => s.longestStreak >= 3,
  },

  /* ── Silver — habits taking root ── */
  {
    id: "ten_parts",
    emoji: "🧩",
    title: "Quiz Whiz",
    description: "Pass 10 quiz parts.",
    how: "Keep passing part quizzes across any lessons — every part counts toward the ten.",
    tier: "silver",
    progress: (s) => ratio(s.partsPassed, 10),
    earned: (s) => s.partsPassed >= 10,
  },
  {
    id: "five_lessons",
    emoji: "📚",
    title: "Bookworm",
    description: "Complete 5 learning journeys.",
    how: "Finish five full lessons, on any topics you like — the shelf fills faster than you think.",
    tier: "silver",
    progress: (s) => ratio(s.lessonsCompleted, 5),
    earned: (s) => s.lessonsCompleted >= 5,
  },
  {
    id: "xp_500",
    emoji: "🏮",
    title: "Steady Flame",
    description: "Gather 500 lifetime XP.",
    how: "Every quiz passed and journey finished adds XP. Keep going — the diya glows a little each day.",
    tier: "silver",
    progress: (s) => ratio(s.xp, 500),
    earned: (s) => s.xp >= 500,
  },
  {
    id: "streak_7",
    emoji: "🔥",
    title: "On Fire",
    description: "Keep a 7-day learning streak.",
    how: "Meet your daily goal every day for a week. Even one part a day keeps the flame alive.",
    tier: "silver",
    progress: (s) => ratio(s.longestStreak, 7),
    earned: (s) => s.longestStreak >= 7,
  },
  {
    id: "polyglot_2",
    emoji: "🌍",
    title: "Bilingual Brain",
    description: "Learn in 2 different languages.",
    how: "Switch the lesson language (from the home screen selector) and complete a part in a second language.",
    tier: "silver",
    progress: (s) => ratio(s.languagesUsed.length, 2),
    earned: (s) => s.languagesUsed.length >= 2,
  },
  {
    id: "level_5",
    emoji: "⭐",
    title: "Rising Star",
    description: "Reach Level 5.",
    how: "Keep earning XP from quizzes, perfect parts and finished journeys until Level 5 lights up.",
    tier: "silver",
    progress: (s) => ratio(s.level, 5),
    earned: (s) => s.level >= 5,
  },
  {
    id: "curious_cat",
    emoji: "🐈",
    title: "Curious Cat",
    description: "Ask 5 follow-up questions.",
    how: "After lessons, use the follow-up box whenever something tugs at you. Five wonders make a whisker.",
    tier: "silver",
    progress: (s) => ratio(s.followUps, 5),
    earned: (s) => s.followUps >= 5,
  },
  {
    id: "goal_getter",
    emoji: "🎯",
    title: "Goal Getter",
    description: "Hit your daily goal 5 times.",
    how: "Fill your daily goal ring on five different days — they don't have to be in a row.",
    tier: "silver",
    progress: (s) => ratio(s.dailyGoalsMet, 5),
    earned: (s) => s.dailyGoalsMet >= 5,
  },
  {
    id: "ten_lessons",
    emoji: "🌊",
    title: "Deep Diver",
    description: "Complete 10 learning journeys.",
    how: "Ten finished journeys — keep asking, keep reading, keep passing those quizzes.",
    tier: "silver",
    progress: (s) => ratio(s.lessonsCompleted, 10),
    earned: (s) => s.lessonsCompleted >= 10,
  },

  /* ── Gold — real dedication ── */
  {
    id: "perfect_lesson",
    emoji: "🏆",
    title: "Perfect Run",
    description: "Finish a journey with a perfect score.",
    how: "Complete every part of one lesson without missing a single quiz answer. Read closely — you've got this.",
    tier: "gold",
    progress: (s) => ratio(s.perfectLessons, 1),
    earned: (s) => s.perfectLessons >= 1,
  },
  {
    id: "sharpshooter",
    emoji: "🎯",
    title: "Sharpshooter",
    description: "Ace 5 quiz parts with perfect scores.",
    how: "Score perfectly on five part quizzes (any lessons). Careful reading beats fast clicking.",
    tier: "gold",
    progress: (s) => ratio(s.perfectParts, 5),
    earned: (s) => s.perfectParts >= 5,
  },
  {
    id: "twenty_lessons",
    emoji: "🧠",
    title: "Knowledge Seeker",
    description: "Complete 20 learning journeys.",
    how: "Twenty finished journeys. By now the questions come to you — follow them.",
    tier: "gold",
    progress: (s) => ratio(s.lessonsCompleted, 20),
    earned: (s) => s.lessonsCompleted >= 20,
  },
  {
    id: "streak_14",
    emoji: "🌙",
    title: "Fortnight of Focus",
    description: "Keep a 14-day learning streak.",
    how: "Meet your daily goal every day for two weeks straight. Small steps, every single day.",
    tier: "gold",
    progress: (s) => ratio(s.longestStreak, 14),
    earned: (s) => s.longestStreak >= 14,
  },
  {
    id: "polyglot_3",
    emoji: "🗺️",
    title: "Polyglot",
    description: "Learn in 3 different languages.",
    how: "Complete parts in three different languages — RealLearn speaks twelve; try a new one.",
    tier: "gold",
    progress: (s) => ratio(s.languagesUsed.length, 3),
    earned: (s) => s.languagesUsed.length >= 3,
  },
  {
    id: "level_10",
    emoji: "🚀",
    title: "Ascendant",
    description: "Reach Level 10.",
    how: "Keep the XP flowing — daily goals, perfect parts and finished journeys all push you upward.",
    tier: "gold",
    progress: (s) => ratio(s.level, 10),
    earned: (s) => s.level >= 10,
  },
  {
    id: "renaissance",
    emoji: "🎭",
    title: "Renaissance Mind",
    description: "Explore 5 different subjects.",
    how: "Wander widely: ask questions across five subjects — science, history, economics, anything.",
    tier: "gold",
    progress: (s) => ratio(s.subjectsSeen.length, 5),
    earned: (s) => s.subjectsSeen.length >= 5,
  },
  {
    id: "habit_builder",
    emoji: "🧱",
    title: "Habit Builder",
    description: "Hit your daily goal 20 times.",
    how: "Twenty days of met goals, in any pattern. Brick by brick, a habit becomes a home.",
    tier: "gold",
    progress: (s) => ratio(s.dailyGoalsMet, 20),
    earned: (s) => s.dailyGoalsMet >= 20,
  },
  {
    id: "endless_wonder",
    emoji: "🎐",
    title: "Endless Wonder",
    description: "Ask 15 follow-up questions.",
    how: "Keep pulling the thread after each lesson — fifteen follow-ups and the wondering never stops.",
    tier: "gold",
    progress: (s) => ratio(s.followUps, 15),
    earned: (s) => s.followUps >= 15,
  },

  /* ── Legendary — the stuff of stories ── */
  {
    id: "streak_30",
    emoji: "🌟",
    title: "Unstoppable",
    description: "Keep a 30-day learning streak.",
    how: "A whole month of met daily goals. Guard your streak freezes — you'll earn a legend.",
    tier: "legendary",
    progress: (s) => ratio(s.longestStreak, 30),
    earned: (s) => s.longestStreak >= 30,
  },
  {
    id: "grand_library",
    emoji: "🏛️",
    title: "Grand Library",
    description: "Complete 50 learning journeys.",
    how: "Fifty finished journeys — a library of your own making. One lesson at a time.",
    tier: "legendary",
    progress: (s) => ratio(s.lessonsCompleted, 50),
    earned: (s) => s.lessonsCompleted >= 50,
  },
  {
    id: "level_20",
    emoji: "🌌",
    title: "Luminary",
    description: "Reach Level 20.",
    how: "The long road: keep learning daily and let the XP gather. Scholars are made of patient days.",
    tier: "legendary",
    progress: (s) => ratio(s.level, 20),
    earned: (s) => s.level >= 20,
  },
];

export const BADGE_BY_ID: Record<string, Badge> = BADGES.reduce(
  (acc, b) => {
    acc[b.id] = b;
    return acc;
  },
  {} as Record<string, Badge>
);

export const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: "#a9713b",
  silver: "#8a8f98",
  gold: "#c9a227",
  legendary: "#8b5cf6",
};
