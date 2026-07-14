"use client";

import type { LessonJourney } from "@/types";

/**
 * IndexedDB archive for full lesson bodies.
 *
 * Cost middle-ground: tiered retention keeps localStorage small (only the
 * newest journeys carry their full lesson inline), but throwing older lesson
 * bodies away meant re-opening them REGENERATED the lesson — an LLM call that
 * costs real money, every time, for content the user already paid for once.
 *
 * So archived lessons move HERE instead of being deleted. IndexedDB has a
 * far larger quota than localStorage (hundreds of MB vs ~5 MB), is fully
 * async (never blocks a render pass — reads/writes happen off the click
 * path), and persists like localStorage does. Re-opening an archived journey
 * is a free local read; regeneration is only the last resort when the copy
 * is genuinely gone (user cleared site data, new device).
 *
 * Everything in this module is best-effort and never throws: if IndexedDB is
 * unavailable (SSR, private mode, ancient browser) the app degrades to the
 * previous behavior (regenerate on open) instead of breaking.
 */

const DB_NAME = "reallearn-lesson-archive";
const DB_VERSION = 1;
const STORE = "lessons";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Run one operation on the lessons store; resolves fallback on any failure. */
async function withStore<T>(
  mode: IDBTransactionMode,
  fallback: T,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDb();
  if (!db) return fallback;
  return new Promise<T>((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      request.onsuccess = () => {
        resolve(request.result as T);
        db.close();
      };
      request.onerror = () => {
        resolve(fallback);
        db.close();
      };
    } catch {
      resolve(fallback);
      db.close();
    }
  });
}

/** Persist a full lesson body keyed by journey id. Fire-and-forget safe. */
export async function saveArchivedLesson(id: string, lesson: LessonJourney): Promise<void> {
  if (!id || !lesson) return;
  await withStore<unknown>("readwrite", undefined, (store) => store.put(lesson, id));
}

/** Load an archived lesson body, or null if we don't have one. */
export async function getArchivedLesson(id: string): Promise<LessonJourney | null> {
  if (!id) return null;
  const result = await withStore<LessonJourney | null | undefined>(
    "readonly",
    null,
    (store) => store.get(id)
  );
  return result ?? null;
}

/** Drop one archived lesson (journey deleted from history). */
export async function deleteArchivedLesson(id: string): Promise<void> {
  if (!id) return;
  await withStore<unknown>("readwrite", undefined, (store) => store.delete(id));
}

/** Drop every archived lesson (used by "Delete My Data"). */
export async function clearArchivedLessons(): Promise<void> {
  await withStore<unknown>("readwrite", undefined, (store) => store.clear());
}
