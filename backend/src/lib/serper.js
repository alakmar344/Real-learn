const SERPER_API_KEY = process.env.SERPER_API_KEY;
// SPEED: the news lookup is nice-to-have context, not a hard dependency — a
// slow retrieval must not hold the whole lesson hostage. 4s is enough for a
// healthy Serper round-trip; past that we proceed without context (the lesson
// generator handles a missing Part-3 context gracefully).
const DEFAULT_SERPER_TIMEOUT_MS = 4000;
const configuredSerperTimeoutMs = Number(process.env.SERPER_TIMEOUT_MS);
const SERPER_TIMEOUT_MS =
  Number.isFinite(configuredSerperTimeoutMs) && configuredSerperTimeoutMs > 0
    ? configuredSerperTimeoutMs
    : DEFAULT_SERPER_TIMEOUT_MS;
// Short-lived in-memory context cache: repeated questions (and client-side
// retries of the same request) skip a whole network round-trip to Serper.
const DEFAULT_SERPER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const configuredSerperCacheTtlMs = Number(process.env.SERPER_CACHE_TTL_MS);
const SERPER_CACHE_TTL_MS =
  Number.isFinite(configuredSerperCacheTtlMs) && configuredSerperCacheTtlMs > 0
    ? configuredSerperCacheTtlMs
    : DEFAULT_SERPER_CACHE_TTL_MS;
const SERPER_CACHE_MAX_ENTRIES = 200;
const contextCache = new Map();

function contextCacheGet(cacheKey) {
  const entry = contextCache.get(cacheKey);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    contextCache.delete(cacheKey);
    return undefined;
  }
  return entry.context;
}

function contextCacheSet(cacheKey, context) {
  if (contextCache.has(cacheKey)) contextCache.delete(cacheKey);
  contextCache.set(cacheKey, { context, expiresAt: Date.now() + SERPER_CACHE_TTL_MS });
  while (contextCache.size > SERPER_CACHE_MAX_ENTRIES) {
    const oldestKey = contextCache.keys().next().value;
    contextCache.delete(oldestKey);
  }
}

const SERPER_LANGUAGE_MAP = {
  bengali: "bn",
  english: "en",
  gujarati: "gu",
  hindi: "hi",
  kannada: "kn",
  malayalam: "ml",
  marathi: "mr",
  odia: "or",
  punjabi: "pa",
  tamil: "ta",
  telugu: "te",
  urdu: "ur",
};

function normalizeSerperLanguage(language) {
  if (!language) {
    return "en";
  }

  const normalizedLanguage = language.trim().toLowerCase();
  return SERPER_LANGUAGE_MAP[normalizedLanguage] ?? "en";
}

export async function fetchRealWorldContext(topic, language) {
  if (!SERPER_API_KEY) {
    console.log("[Serper] Skipping context fetch: SERPER_API_KEY missing");
    return null;
  }

  try {
    const requestId = `serper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hl = normalizeSerperLanguage(language);
    const cacheKey = `${hl}:${String(topic ?? "").trim().toLowerCase().replace(/\s+/g, " ")}`;
    const cached = contextCacheGet(cacheKey);
    if (cached !== undefined) {
      console.log("[Serper] Cache hit; skipping network call", {
        requestId,
        hasContext: Boolean(cached),
      });
      return cached;
    }
    console.log("[Serper] Request start", {
      requestId,
      topicLength: topic?.length ?? 0,
      language,
      hl,
    });
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);
    let response;
    try {
      response = await fetch("https://google.serper.dev/news", {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: topic,
          num: 3,
          gl: "in",
          hl,
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      if (fetchError?.name === "AbortError") {
        console.warn("[Serper] Request timed out; returning null context", {
          requestId,
          timeoutMs: SERPER_TIMEOUT_MS,
        });
        return null;
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log("[Serper] Response received", {
      requestId,
      status: response.status,
      ok: response.ok,
      latencyMs: Date.now() - startedAt,
    });
    if (!response.ok) {
      console.warn("[Serper] Non-OK response; returning null context", {
        requestId,
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    const news = data.news?.slice(0, 3) ?? [];
    console.log("[Serper] Parsed news payload", {
      requestId,
      totalReturned: Array.isArray(data.news) ? data.news.length : 0,
      usedCount: news.length,
    });

    if (news.length === 0) {
      console.log("[Serper] No news items found");
      contextCacheSet(cacheKey, null);
      return null;
    }

    const context = news
      .map(
        (item) =>
          `- ${item.title} (${item.date ?? "date unavailable"})\n  ${item.snippet ?? ""}\n  Source: ${item.link}`
      )
      .join("\n\n");
    console.log("[Serper] Context built", {
      requestId,
      contextLength: context.length,
    });
    contextCacheSet(cacheKey, context);
    return context;
  } catch (error) {
    console.error("[Serper] Context fetch failed with exception", error);
    return null;
  }
}
