/**
 * Verification script for the RealLearn achievement catalog.
 * Tests that all 56 badges have valid definitions, unique IDs, correct tiers,
 * non-nan progress calculations, and proper earned predicates under progress snapshots.
 *
 *   Run:  node scripts/verify-achievements.mjs
 *         (or: npm run verify:achievements)
 */
import { BADGES, BADGE_BY_ID, TIER_COLOR } from "../lib/achievements.ts";

console.log(`Verifying ${BADGES.length} badges in achievement catalog...`);

let failures = 0;
const seenIds = new Set();
const tierCounts = { bronze: 0, silver: 0, gold: 0, legendary: 0 };

for (const badge of BADGES) {
  // 1. Unique ID check
  if (seenIds.has(badge.id)) {
    console.error(`[FAIL] Duplicate badge ID found: "${badge.id}"`);
    failures++;
  }
  seenIds.add(badge.id);

  // 2. TIER_COLOR check
  if (!TIER_COLOR[badge.tier]) {
    console.error(`[FAIL] Invalid tier "${badge.tier}" on badge "${badge.id}"`);
    failures++;
  } else {
    tierCounts[badge.tier]++;
  }

  // 3. Text fields presence check
  if (!badge.title || !badge.description || !badge.how || !badge.emoji) {
    console.error(`[FAIL] Missing text properties on badge "${badge.id}"`);
    failures++;
  }

  // 4. BADGE_BY_ID alignment
  if (!BADGE_BY_ID[badge.id] || BADGE_BY_ID[badge.id] !== badge) {
    console.error(`[FAIL] BADGE_BY_ID lookup failed for "${badge.id}"`);
    failures++;
  }
}

// Check sample snapshots for easy, medium, and impossibly high badges
const zeroSnap = {
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  lessonsCompleted: 0,
  partsPassed: 0,
  perfectParts: 0,
  perfectLessons: 0,
  languagesUsed: [],
  subjectsSeen: [],
  followUps: 0,
  dailyGoalsMet: 0,
  lastActivityHour: null,
};

const easySnap = {
  xp: 150,
  level: 2,
  streak: 5,
  longestStreak: 5,
  lessonsCompleted: 2,
  partsPassed: 6,
  perfectParts: 3,
  perfectLessons: 1,
  languagesUsed: ["en", "hi"],
  subjectsSeen: ["Science", "History"],
  followUps: 2,
  dailyGoalsMet: 3,
  lastActivityHour: 23, // Late Night Shift
};

const medSnap = {
  xp: 3000,
  level: 15,
  streak: 21,
  longestStreak: 21,
  lessonsCompleted: 35,
  partsPassed: 50,
  perfectParts: 10,
  perfectLessons: 5,
  languagesUsed: ["en", "hi", "ta", "te", "mr", "bn", "gu", "kn"],
  subjectsSeen: ["Science", "History", "Math", "Physics", "Chemistry", "Biology", "Economics", "Literature"],
  followUps: 12,
  dailyGoalsMet: 50,
  lastActivityHour: 14,
};

const legendaryMaxSnap = {
  xp: 12000,
  level: 30,
  streak: 100,
  longestStreak: 100,
  lessonsCompleted: 100,
  partsPassed: 200,
  perfectParts: 50,
  perfectLessons: 20,
  languagesUsed: ["en", "hi", "ta", "te", "mr", "bn", "gu", "kn", "ml", "pa", "or", "ur"],
  subjectsSeen: ["Science", "History", "Math", "Physics", "Chemistry", "Biology", "Economics", "Literature", "Art", "Music", "Philosophy", "Geography", "Astronomy", "Psychology", "Technology"],
  followUps: 80,
  dailyGoalsMet: 100,
  lastActivityHour: 2,
};

const snapshots = [
  { name: "zero", snap: zeroSnap },
  { name: "easy", snap: easySnap },
  { name: "medium", snap: medSnap },
  { name: "legendaryMax", snap: legendaryMaxSnap },
];

for (const { name, snap } of snapshots) {
  let earnedCount = 0;
  for (const badge of BADGES) {
    let p;
    let e;
    try {
      p = badge.progress(snap);
      e = badge.earned(snap);
    } catch (err) {
      console.error(`[FAIL] Exception evaluating badge "${badge.id}" on snapshot "${name}":`, err);
      failures++;
      continue;
    }

    if (typeof p !== "number" || Number.isNaN(p) || p < 0 || p > 1) {
      console.error(`[FAIL] Invalid progress value ${p} for badge "${badge.id}" on snapshot "${name}"`);
      failures++;
    }

    if (typeof e !== "boolean") {
      console.error(`[FAIL] Invalid earned boolean for badge "${badge.id}" on snapshot "${name}"`);
      failures++;
    }

    if (e) earnedCount++;
  }
  console.log(`Snapshot "${name}": ${earnedCount}/${BADGES.length} badges earned.`);
}

console.log("\nBadge Distribution by Tier:");
console.log(`- Bronze (Easy / Wins): ${tierCounts.bronze}`);
console.log(`- Silver (Habits & Effort): ${tierCounts.silver}`);
console.log(`- Gold (Medium / Dedication): ${tierCounts.gold}`);
console.log(`- Legendary (Impossibly High / Grind): ${tierCounts.legendary}`);

if (failures === 0) {
  console.log(`\n✅ PASS — All ${BADGES.length} achievements verified cleanly.`);
  process.exit(0);
} else {
  console.error(`\n❌ FAIL — ${failures} issue(s) found in achievements catalog.`);
  process.exit(1);
}
