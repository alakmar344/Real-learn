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
  createScopedStorage,
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
// debouncedStorage's lifecycle listeners touch window/document
globalThis.addEventListener = globalThis.addEventListener ?? (() => {});
globalThis.document = globalThis.document ?? {
  addEventListener: () => {},
  visibilityState: "visible",
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

// 3. Legacy unscoped key migration is CONSUMED by a signed-in scope
//    (regression: every later account inherited the pre-scoping user's data)
const legacyStorage = createScopedStorage(50);
const LEGACY_VALUE = JSON.stringify({ state: { xp: 42 }, version: 0 });

check("first signed-in scope claims the legacy unscoped key and deletes it", () => {
  memoryStorage.set("reallearn-test-mig", LEGACY_VALUE);
  switchUserScope("user_mig_1");
  const migrated = legacyStorage.getItem("reallearn-test-mig");
  return (
    migrated?.state?.xp === 42 &&
    memoryStorage.get("reallearn-test-mig:user_mig_1") === LEGACY_VALUE &&
    memoryStorage.get("reallearn-test-mig") === undefined
  );
});

check("a second account does NOT inherit the legacy data", () => {
  switchUserScope("user_mig_2");
  return legacyStorage.getItem("reallearn-test-mig") === null;
});

check("anon scope reads legacy data without consuming it", () => {
  switchUserScope(null);
  memoryStorage.set("reallearn-test-anon", LEGACY_VALUE);
  const seen = legacyStorage.getItem("reallearn-test-anon");
  return seen?.state?.xp === 42 && memoryStorage.get("reallearn-test-anon") === LEGACY_VALUE;
});

// 4. Scope switch drops the reset-induced pending writes before rehydrating
//    (regression: default state queued under the NEW scope's keys was read
//    back by rehydration and then flushed over the new user's localStorage)
const wipeStorage = createScopedStorage(50);
const REAL_B_STATE = JSON.stringify({ state: { xp: 999 }, version: 0 });

const asyncChecks = (async () => {
  memoryStorage.set("reallearn-test-wipe:user_b", REAL_B_STATE);
  switchUserScope("user_a");
  registerScopeSwitchStores({
    resetLesson: () => {},
    // simulate zustand persist: the reset writes DEFAULT state through the
    // scoped adapter AFTER currentScope has already moved to the new user
    resetProgress: () => wipeStorage.setItem("reallearn-test-wipe", { state: { xp: 0 }, version: 0 }),
    resetJourneys: () => {},
    resetPersonalization: () => {},
    rehydrateAll: () => {},
  });
  switchUserScope("user_b");

  check("rehydration after a user→user switch reads the new user's real data, not pending defaults", () => {
    const read = wipeStorage.getItem("reallearn-test-wipe");
    return read?.state?.xp === 999;
  });

  await new Promise((r) => setTimeout(r, 150));
  check("the dropped default-state write never flushes over the new user's localStorage", () => {
    return memoryStorage.get("reallearn-test-wipe:user_b") === REAL_B_STATE;
  });
})();

await asyncChecks;

if (failures > 0) {
  console.error(`\nFAILED — ${failures} assertion(s) failed.`);
  process.exit(1);
} else {
  console.log("\nPASS — All user scoping & isolation assertions verified cleanly.");
}
