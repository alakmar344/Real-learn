"use client";

import type { PersistStorage } from "zustand/middleware";
import {
  createDebouncedStorage,
  cancelPendingDebouncedWrites,
  flushAllPendingDebouncedWrites,
} from "./debouncedStorage.ts";

let currentScope: string = "anon";
const scopeChangeListeners = new Set<(scope: string) => void>();

export function getActiveUserScope(): string {
  return currentScope;
}

export function subscribeToScopeChange(fn: (scope: string) => void): () => void {
  scopeChangeListeners.add(fn);
  return () => {
    scopeChangeListeners.delete(fn);
  };
}

/**
 * Returns a user-scoped storage key.
 * e.g. "reallearn-progress:user_2xxxx" or "reallearn-progress:anon"
 */
export function getScopedStorageKey(baseName: string, scope: string = currentScope): string {
  const cleanScope = scope?.trim() || "anon";
  return `${baseName}:${cleanScope}`;
}

/**
 * Migrate legacy unscoped storage keys (e.g. "reallearn-progress") to the active
 * user's scoped key on first sign-in.
 */
function migrateLegacyStorageIfNeeded(baseName: string, targetKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const targetVal = window.localStorage.getItem(targetKey);
    if (!targetVal) {
      const legacyVal = window.localStorage.getItem(baseName);
      if (legacyVal) {
        window.localStorage.setItem(targetKey, legacyVal);
      }
    }
  } catch {
    // Best-effort
  }
}

/**
 * Creates a debounced PersistStorage adapter that dynamically resolves the
 * key based on the currently active user scope.
 */
export function createScopedStorage<S>(delayMs = 800): PersistStorage<S> {
  const debounced = createDebouncedStorage<S>(delayMs);

  return {
    getItem: (name) => {
      const scopedKey = getScopedStorageKey(name, currentScope);
      migrateLegacyStorageIfNeeded(name, scopedKey);
      return debounced.getItem(scopedKey);
    },
    setItem: (name, value) => {
      const scopedKey = getScopedStorageKey(name, currentScope);
      debounced.setItem(scopedKey, value);
    },
    removeItem: (name) => {
      const scopedKey = getScopedStorageKey(name, currentScope);
      debounced.removeItem(scopedKey);
    },
  };
}

export interface ScopeSwitchStores {
  resetLesson: () => void;
  resetProgress: () => void;
  resetJourneys: () => void;
  resetPersonalization: () => void;
  rehydrateAll: () => void;
}

let registeredStores: ScopeSwitchStores | null = null;

export function registerScopeSwitchStores(stores: ScopeSwitchStores): void {
  registeredStores = stores;
}

/**
 * Switch the active user scope (e.g. on Clerk auth state change).
 * Handles flushing previous writes, updating scope, wiping in-memory data on sign-out,
 * and rehydrating persisted stores for the new user.
 */
export function switchUserScope(newUserId: string | null | undefined): void {
  const newScope = newUserId?.trim() || "anon";
  if (newScope === currentScope) return;

  // 1. Flush any pending debounced writes under the old user scope
  try {
    flushAllPendingDebouncedWrites();
  } catch {
    cancelPendingDebouncedWrites();
  }

  const previousScope = currentScope;
  currentScope = newScope;

  // 2. If LEAVING a signed-in scope (sign-out OR a direct user_A → user_B
  // switch, e.g. Clerk multi-session account switching), wipe in-memory and
  // session state. This must run for user→user transitions too: rehydrate()
  // alone leaves the previous user's in-memory state intact whenever the new
  // user has no persisted data yet — which would both SHOW user A's private
  // progress/journeys to user B and then persist them under B's scoped keys
  // on B's next write (a permanent cross-account data leak).
  if (previousScope !== "anon") {
    try {
      sessionStorage.removeItem("reallearn_draft_question");
    } catch {
      // ignore
    }
    if (registeredStores) {
      registeredStores.resetLesson();
      registeredStores.resetProgress();
      registeredStores.resetJourneys();
      registeredStores.resetPersonalization();
    }
  }

  // 3. Notify listeners (e.g. IndexedDB archive scope)
  scopeChangeListeners.forEach((listener) => {
    try {
      listener(newScope);
    } catch {
      // ignore listener errors
    }
  });

  // 4. Rehydrate stores for the new scope
  if (registeredStores) {
    try {
      registeredStores.rehydrateAll();
    } catch {
      // ignore rehydration errors
    }
  }
}
