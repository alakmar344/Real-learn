const TOKEN = process.env.CLOUDFLARE_API_TOKEN?.trim();
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const URL = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(ACCOUNT_ID || "")}/ai/v1/chat/completions`;

if (!TOKEN || !ACCOUNT_ID) {
  console.log("[gemma-ping] CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set. Skipping.");
  process.exit(0);
}

async function run() {
  console.log("[gemma-ping] starting non-streaming hi to Cloudflare Workers AI");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: "hi" }],
        temperature: 0,
        max_tokens: 64,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    console.log(`[gemma-ping] status=${res.status}`);
    console.log(`[gemma-ping] response=${text}`);
    process.exit(res.ok ? 0 : 1);
  } catch (err) {
    clearTimeout(timeout);
    console.log(`[gemma-ping] error=${err.message}`);
    process.exit(1);
  }
}

run();
