/**
 * Verification script for the RealLearn special-day catalog.
 * Tests that every entry has a real calendar date, unique id, no duplicate
 * dates, present name + greeting, and well-formed hero lines.
 *
 *   Run:  node scripts/verify-special-days.mjs
 *         (or: npm run verify:special-days)
 */
import { SPECIAL_DAYS } from "../lib/specialDays.ts";

console.log(`Verifying ${SPECIAL_DAYS.length} special days...`);

let failures = 0;
const seenIds = new Set();
const seenDates = new Set();

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

for (const day of SPECIAL_DAYS) {
  // 1. Unique id check
  if (seenIds.has(day.id)) {
    console.error(`[FAIL] Duplicate special-day id: "${day.id}"`);
    failures++;
  }
  seenIds.add(day.id);

  // 2. Real calendar date check
  if (day.month < 1 || day.month > 12) {
    console.error(`[FAIL] Invalid month ${day.month} on "${day.id}"`);
    failures++;
  } else if (day.day < 1 || day.day > DAYS_IN_MONTH[day.month - 1]) {
    console.error(`[FAIL] Invalid day ${day.day} for month ${day.month} on "${day.id}"`);
    failures++;
  }

  // 3. No two entries share a date (fixed-date observances only)
  const key = `${day.month}-${day.day}`;
  if (seenDates.has(key)) {
    console.error(`[FAIL] Duplicate date ${key} on "${day.id}"`);
    failures++;
  }
  seenDates.add(key);

  // 4. Required fields present
  if (!day.name || !day.greeting) {
    console.error(`[FAIL] Missing name/greeting on "${day.id}"`);
    failures++;
  }

  // 5. Hero lines must be punctuation-free (page.tsx appends ", {name}!"),
  //    so the composed "Happy New Year, Aarav!" never doubles up.
  if (day.hero && /[.!,?]$/.test(day.hero.trim())) {
    console.error(`[FAIL] Hero line on "${day.id}" must not end with punctuation: "${day.hero}"`);
    failures++;
  }
}

// Leap day is allowed in the date check; a fixed-date entry on 02-29 is fine.
console.log(`\nSpecial-day distribution:`);
for (let m = 1; m <= 12; m++) {
  const count = SPECIAL_DAYS.filter((d) => d.month === m).length;
  if (count) console.log(`- month ${m}: ${count}`);
}

if (failures === 0) {
  console.log(`\nPASS — All ${SPECIAL_DAYS.length} special days verified cleanly.`);
  process.exit(0);
} else {
  console.error(`\nFAIL — ${failures} issue(s) found in the special-day catalog.`);
  process.exit(1);
}
