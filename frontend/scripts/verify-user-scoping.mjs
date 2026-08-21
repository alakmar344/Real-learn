/**
 * Verification script for User-Scoped Storage & Sign-Out State Isolation
 * (lib/userScopedStorage.ts).
 *
 * Verifies:
 *  - Storage key scoping per user (`reallearn-progress:user_123`, `reallearn-progress:anon`)
 *  - Sign-out state isolation: wipes in-memory stores and sessionStorage draft
 *  - Multi-user isolation: User A's data never leaks to User B
 */
import {
  getScopedStorageKey,
  getActiveUserScope,
  registerScopeSwitchStores,
  switchUserScope,
} from "../lib/userScopedStorage.ts";

let failures = 0;
function check(name, fn) {
  let pass = false;
  try {
    pass = Boolean(fn());
  } catch (err) {
    console.error(`[FAIL] ${name} — threw:`, err?.message ?? err);
    failures++;
    return;
  }
  if (pass) {
    console.log(`  ok  ${name}`);
  } else {
    console.error(`[FAIL] ${name}`);
    failures++;
  }
}

// Mock window, localStorage, sessionStorage for Node CLI test environment
const memoryStorage = new Map();
const sessionMemoryStorage = new Map();

globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => memoryStorage.get(k) ?? null,
  setItem: (k, v) => memoryStorage.set(k, String(v)),
  removeItem: (k) => memoryStorage.delete(k),
  clear: () => memoryStorage.clear(),
};
globalThis.sessionStorage = {
  getItem: (k) => sessionMemoryStorage.get(k) ?? null,
  setItem: (k, v) => sessionMemoryStorage.set(k, String(v)),
  removeItem: (k) => sessionMemoryStorage.delete(k),
  clear: () => sessionMemoryStorage.clear(),
};

console.log("User Scoping & Isolation Tests:");

// 1. Key generation
check("getScopedStorageKey formats keys with user scope", () => {
  const anonKey = getScopedStorageKey("reallearn-progress", "anon");
  const userKey = getScopedStorageKey("reallearn-progress", "user_abc123");
  return anonKey === "reallearn-progress:anon" && userKey === "reallearn-progress:user_abc123";
});

// 2. Active scope tracking & switching
let resetLessonCount = 0;
let resetProgressCount = 0;
let resetJourneysCount = 0;
let resetPersonalizationCount = 0;
let rehydrateCount = 0;

registerScopeSwitchStores({
  resetLesson: () => resetLessonCount++,
  resetProgress: () => resetProgressCount++,
  resetJourneys: () => resetJourneysCount++,
  resetPersonalization: () => resetPersonalizationCount++,
  rehydrateAll: () => rehydrateCount++,
});

check("switchUserScope sets active scope to user ID", () => {
  switchUserScope("user_test_1");
  return getActiveUserScope() === "user_test_1";
});

check("switchUserScope rehydrates on user change", () => {
  const initialRehydrate = rehydrateCount;
  switchUserScope("user_test_2");
  return rehydrateCount > initialRehydrate && getActiveUserScope() === "user_test_2";
});

check("direct user→user switch resets all in-memory stores (no cross-account leak)", () => {
  const prevLessonResets = resetLessonCount;
  const prevProgressResets = resetProgressCount;
  const prevJourneysResets = resetJourneysCount;
  const prevPersonalizationResets = resetPersonalizationCount;
  const prevRehydrates = rehydrateCount;

  switchUserScope("user_test_3");

  return (
    resetLessonCount > prevLessonResets &&
    resetProgressCount > prevProgressResets &&
    resetJourneysCount > prevJourneysResets &&
    resetPersonalizationCount > prevPersonalizationResets &&
    rehydrateCount > prevRehydrates &&
    getActiveUserScope() === "user_test_3"
  );
});

check("sign out (switch to anon) resets all in-memory stores and clears session draft", () => {
  sessionStorage.setItem("reallearn_draft_question", "secret question");
  const prevLessonResets = resetLessonCount;
  const prevProgressResets = resetProgressCount;
  const prevJourneysResets = resetJourneysCount;
  const prevPersonalizationResets = resetPersonalizationCount;

  switchUserScope(null);

  const draftCleared = sessionStorage.getItem("reallearn_draft_question") === null;
  const storesReset =
    resetLessonCount > prevLessonResets &&
    resetProgressCount > prevProgressResets &&
    resetJourneysCount > prevJourneysResets &&
    resetPersonalizationCount > prevPersonalizationResets;

  return draftCleared && storesReset && getActiveUserScope() === "anon";
});

if (failures > 0) {
  console.error(`\nFAILED — ${failures} assertion(s) failed.`);
  process.exit(1);
} else {
  console.log("\nPASS — All user scoping & isolation assertions verified cleanly.");
}
