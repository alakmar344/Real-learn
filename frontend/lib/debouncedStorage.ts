"use client";

import type { PersistStorage, StorageValue } from "zustand/middleware";

/** Minimal debounce — trailing-only by default, with cancel/flush. */
function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
  _options?: { leading?: boolean; trailing?: boolean }
): T & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: unknown[]) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...(args as Parameters<T>));
    }, ms);
  }) as T & { cancel: () => void; flush: () => void };
  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      fn();
    }
  };
  return debounced;
}

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

  const flush = () => {
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

  const debouncedFlush = debounce(flush, delayMs, {
    leading: false,
    trailing: true,
  });

  cancelCallbacks.add(() => {
    pending = null;
    debouncedFlush.cancel();
  });

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => debouncedFlush.flush());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") debouncedFlush.flush();
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
      debouncedFlush();
    },
    removeItem: (name) => {
      pending = null;
      debouncedFlush.cancel();
      try {
        window.localStorage.removeItem(name);
      } catch {
        // ignore storage errors
      }
    },
  };
}
