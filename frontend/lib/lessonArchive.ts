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
 *
 * STORAGE FORMAT (v2): every record is COMPRESSED JSON. The lesson is
 * serialized with JSON.stringify and gzip-compressed via the native
 * `CompressionStream` API before being written, cutting the on-disk footprint
 * of lesson text by ~70-80% (prose compresses extremely well) so the archive
 * fits far more lessons inside the browser's storage quota. Records are
 * self-describing envelopes:
 *
 *   { v: 2, enc: "gzip", data: ArrayBuffer }   — gzip-compressed JSON bytes
 *   { v: 2, enc: "json", data: string }        — plain JSON string (fallback
 *                                                when CompressionStream is
 *                                                unavailable, e.g. old Safari)
 *
 * Reads transparently handle both envelope kinds AND legacy v1 records (the
 * raw structured-cloned lesson object), so no migration pass is needed —
 * old entries stay readable and are upgraded to compressed form the next
 * time they are saved.
 */

const DB_NAME = "reallearn-lesson-archive";
const DB_VERSION = 1;
const STORE = "lessons";

/** Envelope written since storage format v2 — compressed (or plain) JSON. */
interface ArchiveEnvelope {
  v: 2;
  enc: "gzip" | "json";
  data: ArrayBuffer | string;
}

function isEnvelope(value: unknown): value is ArchiveEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ArchiveEnvelope).v === 2 &&
    ((value as ArchiveEnvelope).enc === "gzip" ||
      (value as ArchiveEnvelope).enc === "json")
  );
}

const hasCompressionStreams =
  typeof CompressionStream !== "undefined" &&
  typeof DecompressionStream !== "undefined";

/** Pipe bytes through a Compression/DecompressionStream and collect them. */
async function pipeThrough(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream
): Promise<ArrayBuffer> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return await new Response(stream).arrayBuffer();
}

/** Serialize a lesson to its stored envelope: gzip JSON when supported. */
async function encodeLesson(lesson: LessonJourney): Promise<ArchiveEnvelope> {
  const json = JSON.stringify(lesson);
  if (hasCompressionStreams) {
    try {
      const data = await pipeThrough(
        new TextEncoder().encode(json),
        new CompressionStream("gzip")
      );
      return { v: 2, enc: "gzip", data };
    } catch {
      // fall through to plain JSON — storing uncompressed beats not storing
    }
  }
  return { v: 2, enc: "json", data: json };
}

/** Decode a stored record of ANY historical format back into a lesson. */
async function decodeLesson(record: unknown): Promise<LessonJourney | null> {
  if (record == null) return null;
  // Legacy v1 record: the lesson object itself, structured-cloned as-is.
  if (!isEnvelope(record)) return record as LessonJourney;
  try {
    if (record.enc === "json") {
      return JSON.parse(record.data as string) as LessonJourney;
    }
    if (!hasCompressionStreams) return null; // can't inflate on this browser
    const inflated = await pipeThrough(
      new Uint8Array(record.data as ArrayBuffer),
      new DecompressionStream("gzip")
    );
    return JSON.parse(new TextDecoder().decode(inflated)) as LessonJourney;
  } catch {
    // Corrupted/truncated record — treat as missing (regenerate-on-open).
    return null;
  }
}

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

/**
 * Persist a full lesson body keyed by journey id, stored as compressed JSON
 * (see STORAGE FORMAT above). Fire-and-forget safe.
 */
export async function saveArchivedLesson(id: string, lesson: LessonJourney): Promise<void> {
  if (!id || !lesson) return;
  const db = await openDb();
  if (!db) return;
  try {
    const envelope = await encodeLesson(lesson);
    await db.put(STORE, envelope, id);
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
    return await decodeLesson(await db.get(STORE, id));
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
