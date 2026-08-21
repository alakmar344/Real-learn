"use client";

import type { PersistStorage, StorageValue } from "zustand/middleware";

/** Minimal debounce — trailing-only by default, with cancel/flush. */
function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
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
/** Flush callbacks for every live debounced storage. */
const flushCallbacks = new Set<() => void>();

let lifecycleListenersAttached = false;
function ensureLifecycleListeners(): void {
  if (lifecycleListenersAttached || typeof window === "undefined") return;
  lifecycleListenersAttached = true;

  const flushAll = () => {
    flushCallbacks.forEach((flush) => {
      try {
        flush();
      } catch {
        // best-effort flush on exit
      }
    });
  };

  window.addEventListener("pagehide", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
  window.addEventListener("beforeunload", flushAll);
}

/**
 * Drop every pending (not-yet-flushed) debounced write across all stores.
 * Needed by "Delete My Data": localStorage keys are removed directly there,
 * and without this a write scheduled moments earlier would fire after the
 * deletion and resurrect the user's data.
 */
export function cancelPendingDebouncedWrites(): void {
  cancelCallbacks.forEach((cancel) => cancel());
}

/**
 * Immediately flush all pending writes across all stores (e.g. before switching user scopes).
 */
export function flushAllPendingDebouncedWrites(): void {
  flushCallbacks.forEach((flush) => {
    try {
      flush();
    } catch {
      // best-effort
    }
  });
}

export function createDebouncedStorage<S>(delayMs = 800): PersistStorage<S> {
  let pending: { name: string; value: StorageValue<S> } | null = null;

  const flush = () => {
    if (!pending) return;
    const entry = pending;
    pending = null;
    try {
      window.localStorage.setItem(entry.name, JSON.stringify(entry.value));
    } catch {
      // Quota exceeded / private mode / blocked storage — persistence is
      // best-effort; never crash the app over it. But do NOT silently drop
      // the state: keep it queued (unless a newer write superseded it while
      // stringify/setItem ran) so the next debounce tick, pagehide flush, or
      // scope-switch flush retries it — a transient quota error no longer
      // permanently loses just-earned progress.
      if (!pending) {
        pending = entry;
      }
    }
  };

  const debouncedFlush = debounce(flush, delayMs);

  const cancelEntry = () => {
    pending = null;
    debouncedFlush.cancel();
  };
  const flushEntry = () => {
    // Call flush() directly rather than debouncedFlush.flush(): the latter
    // only fires while a debounce timer is armed, which would skip a pending
    // entry that was restored after a failed setItem (its timer already
    // fired). flush() itself no-ops when nothing is pending.
    debouncedFlush.cancel();
    flush();
  };

  cancelCallbacks.add(cancelEntry);
  flushCallbacks.add(flushEntry);

  ensureLifecycleListeners();

  return {
    getItem: (name) => {
      if (pending && pending.name === name) {
        return pending.value;
      }
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
