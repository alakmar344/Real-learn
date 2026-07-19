"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { LessonJourney } from "@/types";

/**
 * IndexedDB archive for full lesson bodies.
 *
 * Since policy v2.4 EVERY saved chat's lesson body lives here, and the
 * journeys store keeps only a lightweight index in localStorage. This keeps
 * localStorage serialization cheap (the lag fix) without ever REGENERATING a
 * lesson on re-open — an LLM call that costs real money, every time, for
 * content the user already paid for once.
 *
 * IndexedDB has a
 * far larger quota than localStorage (hundreds of MB vs ~5 MB), is fully
 * async (never blocks a render pass — reads/writes happen off the click
 * path), and persists like localStorage does. Re-opening an archived journey
 * is a free local read; regeneration is only the last resort when the copy
 * is genuinely gone (user cleared site data, new device).
 *
 * Everything in this module is best-effort and never throws: if IndexedDB is
 * unavailable (SSR, private mode, ancient browser) the app degrades to the
 * previous behavior (regenerate on open) instead of breaking.
 *
 * The bespoke promise-wrapped IndexedDB boilerplate was replaced by `idb`,
 * Jake Archibald's tiny, well-established Promise wrapper for IndexedDB —
 * it owns the DB-open/upgrade + transaction lifecycle and gives us simple
 * async `get`/`put`/`delete`/`clear` calls.
 */

const DB_NAME = "reallearn-lesson-archive";
const DB_VERSION = 1;
const STORE = "lessons";

let dbPromise: Promise<IDBPDatabase | null> | null = null;

function openDb(): Promise<IDBPDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    if (typeof indexedDB === "undefined") return null;
    try {
      return await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE);
          }
        },
      });
    } catch {
      return null;
    }
  })();
  return dbPromise;
}

/** Persist a full lesson body keyed by journey id. Fire-and-forget safe. */
export async function saveArchivedLesson(id: string, lesson: LessonJourney): Promise<void> {
  if (!id || !lesson) return;
  const db = await openDb();
  if (!db) return;
  try {
    await db.put(STORE, lesson, id);
  } catch {
    // best-effort persistence — never throw
  }
}

/** Load an archived lesson body, or null if we don't have one. */
export async function getArchivedLesson(id: string): Promise<LessonJourney | null> {
  if (!id) return null;
  const db = await openDb();
  if (!db) return null;
  try {
    return (await db.get(STORE, id)) ?? null;
  } catch {
    return null;
  }
}

/** Drop one archived lesson (journey deleted from history). */
export async function deleteArchivedLesson(id: string): Promise<void> {
  if (!id) return;
  const db = await openDb();
  if (!db) return;
  try {
    await db.delete(STORE, id);
  } catch {
    // best-effort — never throw
  }
}

/** Drop every archived lesson (used by "Delete My Data"). */
export async function clearArchivedLessons(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    await db.clear(STORE);
  } catch {
    // best-effort — never throw
  }
}
