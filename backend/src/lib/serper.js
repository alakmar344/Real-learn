const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_TIMEOUT_MS = 8000;
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
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);

  try {
    const response = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: topic,
        num: 3,
        gl: "in",
        hl: normalizeSerperLanguage(language),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const news = data.news?.slice(0, 3) ?? [];

    if (news.length === 0) return null;

    return news
      .map(
        (item) =>
          `- ${item.title} (${item.date ?? "date unavailable"})\n  ${item.snippet ?? ""}\n  Source: ${item.link}`
      )
      .join("\n\n");
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
        console.warn("[Serper] Context fetch timed out");
    }
    return null;
  }
}
