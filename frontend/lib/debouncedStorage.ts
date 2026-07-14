"use client";

import type { PersistStorage, StorageValue } from "zustand/middleware";

/**
 * Debounced localStorage adapter for zustand `persist`.
 *
 * The default persist storage runs JSON.stringify + a synchronous
 * localStorage write on EVERY set() — i.e. inside every quiz click's render
 * pass. With a large persisted state (journey history, a full lesson) that
 * main-thread work is what made the app feel slower and laggier the more
 * lessons a user completed.
 *
 * This adapter defers both the serialization and the write until the user
 * has been idle for `delayMs`, and flushes immediately when the tab is
 * hidden or closed so no state is lost. Reads stay synchronous, so store
 * hydration is unchanged.
 */
/** Cancel callbacks for every live debounced storage (see below). */
const cancelCallbacks = new Set<() => void>();

/**
 * Drop every pending (not-yet-flushed) debounced write across all stores.
 * Needed by "Delete My Data": localStorage keys are removed directly there,
 * and without this a write scheduled moments earlier would fire after the
 * deletion and resurrect the user's data.
 */
export function cancelPendingDebouncedWrites(): void {
  cancelCallbacks.forEach((cancel) => cancel());
}

export function createDebouncedStorage<S>(delayMs = 800): PersistStorage<S> {
  let pending: { name: string; value: StorageValue<S> } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  cancelCallbacks.add(() => {
    pending = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    const { name, value } = pending;
    pending = null;
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Quota exceeded / private mode / blocked storage — persistence is
      // best-effort; never crash the app over it.
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  return {
    getItem: (name) => {
      try {
        const raw = window.localStorage.getItem(name);
        return raw ? (JSON.parse(raw) as StorageValue<S>) : null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    removeItem: (name) => {
      pending = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      try {
        window.localStorage.removeItem(name);
      } catch {
        // ignore storage errors
      }
    },
  };
}
