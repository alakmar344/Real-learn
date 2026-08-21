"use client";

import { LRUCache } from "lru-cache";

// BANDWIDTH: in-memory LRU of synthesized audio blobs. Replaying the same
// text (pause/restart, re-listening to a part) reuses the blob instead of
// re-downloading ~1 MB of MP3 from the backend. `lru-cache` enforces the
// byte budget and evicts least-recently-used entries for us.
//
// Lives in its own module (not hooks/useSpeech.ts) so consumers that only
// need to CLEAR the cache — e.g. the settings page's account-deletion flow —
// don't pull the whole Edge-TTS + speech-recognition implementation (and its
// remove-markdown dependency) into their bundle.
const TTS_BLOB_CACHE_MAX_BYTES = 12 * 1024 * 1024;
const ttsBlobCache = new LRUCache<string, Blob>({
  maxSize: TTS_BLOB_CACHE_MAX_BYTES,
  sizeCalculation: (blob) => blob.size,
});

export function ttsBlobCacheGet(key: string): Blob | undefined {
  return ttsBlobCache.get(key);
}

export function ttsBlobCacheSet(key: string, blob: Blob): void {
  ttsBlobCache.set(key, blob);
}

/**
 * PRIVACY: the cache is module-global, so synthesized lesson audio would
 * otherwise survive sign-out and "Delete My Data". Call this from those flows
 * to drop every cached blob. (Object URLs are per-playback, owned and revoked
 * by the hook's refs — the cache holds raw Blobs only, so clearing suffices.)
 */
export function clearTtsCache(): void {
  ttsBlobCache.clear();
}
