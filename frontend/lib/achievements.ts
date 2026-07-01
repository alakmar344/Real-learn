// lib/achievements.ts
// Pure helpers for the RealLearn engagement system: XP/level maths, streak
// date logic, and the achievement (badge) catalogue with unlock predicates.
//
// Everything here is deterministic and side-effect free so it can be unit
// tested and reused from the store, the UI, and the share card.

/* ─────────────────────────── XP & Levels ─────────────────────────── */

/**
 * XP required to advance FROM the given level TO the next one.
 * A gently rising curve: 100, 150, 200, 250 … keeps early wins fast while
 * making higher levels feel earned.
 */
export function xpToNextLevel(level: number): number {
  return 100 + (Math.max(1, level) - 1) * 50;
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

/** XP for passing one part's quiz. `score` = correct answers in that part. */
export function xpForPart(score: number): number {
  return 20 + Math.max(0, score) * 15;
}

/** Bonus XP for finishing a whole 3-part journey. */
export function xpForLessonComplete(totalScore: number, maxScore = 6): number {
  const base = 60;
  const perfect = totalScore >= maxScore ? 100 : 0;
  return base + perfect;
}

/** A small streak kicker applied on lesson completion (capped so it stays sane). */
export function xpForStreak(streak: number): number {
  return Math.min(50, Math.max(0, streak - 1) * 5);
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
 * - 1 day gap → consume a freeze if available (streak survives), else reset.
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
  {
    id: "first_lesson",
    emoji: "🎓",
    title: "First Steps",
    description: "Complete your very first learning journey.",
    tier: "bronze",
    progress: (s) => ratio(s.lessonsCompleted, 1),
    earned: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: "five_lessons",
    emoji: "📚",
    title: "Bookworm",
    description: "Complete 5 learning journeys.",
    tier: "silver",
    progress: (s) => ratio(s.lessonsCompleted, 5),
    earned: (s) => s.lessonsCompleted >= 5,
  },
  {
    id: "twenty_lessons",
    emoji: "🧠",
    title: "Knowledge Seeker",
    description: "Complete 20 learning journeys.",
    tier: "gold",
    progress: (s) => ratio(s.lessonsCompleted, 20),
    earned: (s) => s.lessonsCompleted >= 20,
  },
  {
    id: "first_perfect_part",
    emoji: "💯",
    title: "Flawless",
    description: "Ace a quiz with a perfect part score.",
    tier: "bronze",
    progress: (s) => ratio(s.perfectParts, 1),
    earned: (s) => s.perfectParts >= 1,
  },
  {
    id: "perfect_lesson",
    emoji: "🏆",
    title: "Perfect Run",
    description: "Finish a journey with a flawless 6/6.",
    tier: "gold",
    progress: (s) => ratio(s.perfectLessons, 1),
    earned: (s) => s.perfectLessons >= 1,
  },
  {
    id: "streak_3",
    emoji: "🔥",
    title: "Warming Up",
    description: "Keep a 3-day learning streak.",
    tier: "bronze",
    progress: (s) => ratio(s.longestStreak, 3),
    earned: (s) => s.longestStreak >= 3,
  },
  {
    id: "streak_7",
    emoji: "🔥",
    title: "On Fire",
    description: "Keep a 7-day learning streak.",
    tier: "silver",
    progress: (s) => ratio(s.longestStreak, 7),
    earned: (s) => s.longestStreak >= 7,
  },
  {
    id: "streak_30",
    emoji: "🌟",
    title: "Unstoppable",
    description: "Keep a 30-day learning streak.",
    tier: "legendary",
    progress: (s) => ratio(s.longestStreak, 30),
    earned: (s) => s.longestStreak >= 30,
  },
  {
    id: "polyglot_2",
    emoji: "🌍",
    title: "Bilingual Brain",
    description: "Learn in 2 different languages.",
    tier: "silver",
    progress: (s) => ratio(s.languagesUsed.length, 2),
    earned: (s) => s.languagesUsed.length >= 2,
  },
  {
    id: "polyglot_3",
    emoji: "🗺️",
    title: "Polyglot",
    description: "Learn in 3 different languages.",
    tier: "gold",
    progress: (s) => ratio(s.languagesUsed.length, 3),
    earned: (s) => s.languagesUsed.length >= 3,
  },
  {
    id: "level_5",
    emoji: "⭐",
    title: "Rising Star",
    description: "Reach Level 5.",
    tier: "silver",
    progress: (s) => ratio(s.level, 5),
    earned: (s) => s.level >= 5,
  },
  {
    id: "level_10",
    emoji: "🚀",
    title: "Ascendant",
    description: "Reach Level 10.",
    tier: "gold",
    progress: (s) => ratio(s.level, 10),
    earned: (s) => s.level >= 10,
  },
  {
    id: "renaissance",
    emoji: "🎭",
    title: "Renaissance Mind",
    description: "Explore 5 different subjects.",
    tier: "gold",
    progress: (s) => ratio(s.subjectsSeen.length, 5),
    earned: (s) => s.subjectsSeen.length >= 5,
  },
  {
    id: "curious_cat",
    emoji: "🐈",
    title: "Curious Cat",
    description: "Ask 5 follow-up questions.",
    tier: "silver",
    progress: (s) => ratio(s.followUps, 5),
    earned: (s) => s.followUps >= 5,
  },
  {
    id: "goal_getter",
    emoji: "🎯",
    title: "Goal Getter",
    description: "Hit your daily goal 5 times.",
    tier: "silver",
    progress: (s) => ratio(s.dailyGoalsMet, 5),
    earned: (s) => s.dailyGoalsMet >= 5,
  },
  {
    id: "night_owl",
    emoji: "🦉",
    title: "Night Owl",
    description: "Learn something after midnight.",
    tier: "bronze",
    progress: (s) => (s.lastActivityHour !== null && s.lastActivityHour < 5 ? 1 : 0),
    earned: (s) => s.lastActivityHour !== null && s.lastActivityHour >= 0 && s.lastActivityHour < 5,
  },
  {
    id: "early_bird",
    emoji: "🐦",
    title: "Early Bird",
    description: "Learn something before 8am.",
    tier: "bronze",
    progress: (s) => (s.lastActivityHour !== null && s.lastActivityHour >= 5 && s.lastActivityHour < 8 ? 1 : 0),
    earned: (s) => s.lastActivityHour !== null && s.lastActivityHour >= 5 && s.lastActivityHour < 8,
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
