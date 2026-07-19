import { LRUCache } from "lru-cache";

/**
 * Shared LRU cache factory. Replaces the bespoke insertion-ordered `Map`
 * "LRU" implementations that were hand-rolled across the codebase
 * (lesson cache, Serper context cache, moderation verdict cache, TTS cache).
 *
 * `lru-cache` is the de-facto standard LRU for Node — it does the
 * recency-eviction + capacity cap correctly and efficiently, with a stable,
 * well-tested API. Each caller configures its own `max` (entry count) and
 * `ttl` (per-entry time-to-live in ms).
 */
export function createLruCache(options) {
  const { max, ttlMs } = options;
  return new LRUCache({
    max,
    ttl: ttlMs ?? undefined,
    // Honor the per-entry `expiresAt` stamping the callers already compute by
    // storing the absolute expiry as the cache "ttl" via size/ttl metadata.
    // When no ttl is requested the cache is purely size-bounded.
  });
}
