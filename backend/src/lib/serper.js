const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function fetchRealWorldContext(topic) {
  if (!SERPER_API_KEY) {
    return null;
  }

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
        hl: "en",
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const news = data.news?.slice(0, 3) ?? [];

    if (news.length === 0) return null;

    return news
      .map(
        (item) =>
          `- ${item.title} (${item.date ?? "recent"})\n  ${item.snippet ?? ""}\n  Source: ${item.link}`
      )
      .join("\n\n");
  } catch {
    return null;
  }
}
