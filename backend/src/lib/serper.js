const SERPER_API_KEY = process.env.SERPER_API_KEY;
const DEFAULT_SERPER_TIMEOUT_MS = 6000;
const configuredSerperTimeoutMs = Number(process.env.SERPER_TIMEOUT_MS);
const SERPER_TIMEOUT_MS =
  Number.isFinite(configuredSerperTimeoutMs) && configuredSerperTimeoutMs > 0
    ? configuredSerperTimeoutMs
    : DEFAULT_SERPER_TIMEOUT_MS;
const SERPER_LANGUAGE_MAP = {
  bengali: "bn",
  english: "en",
  gujarati: "gu",
  hindi: "hi",
  kannada: "kn",
  malayalam: "ml",
  marathi: "mr",
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
    return context;
  } catch (error) {
    console.error("[Serper] Context fetch failed with exception", error);
    return null;
  }
}
