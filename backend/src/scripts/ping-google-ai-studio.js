const API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY?.trim();

if (!API_KEY) {
  console.log("[google-ai-studio-ping] GOOGLE_AI_STUDIO_API_KEY not set. Skipping.");
  process.exit(0);
}

const MODEL = "gemini-2.0-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;

async function run() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    console.log(`[google-ai-studio-ping] status=${res.status}`);
    console.log(`[google-ai-studio-ping] response=${text}`);
  } catch (err) {
    clearTimeout(timeout);
    console.log(`[google-ai-studio-ping] error=${err.message}`);
  }
}

run();
