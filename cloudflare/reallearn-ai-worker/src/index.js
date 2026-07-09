// RealLearn AI Worker
//
// Proxies chat-completion requests to Cloudflare Workers AI via the in-network
// `AI` binding. Deployed with Smart Placement so the Worker runs close to the
// upstream GPUs and benefits from Shard & Conquer (consistent-hash isolate
// warming). The backend calls this Worker instead of the public REST API.
//
// Expected request: POST with JSON body { model, messages, temperature, max_tokens }
// Response: OpenAI-style { choices: [{ message: { content } }] }

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const workerToken = env.WORKER_TOKEN;
    if (workerToken) {
      const auth = request.headers.get("Authorization") || "";
      const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (provided !== workerToken) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }

    const model = body.model;
    if (!model || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: "model and messages are required" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    try {
      const result = await env.AI.run(model, {
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 4000,
      });

      const text =
        result?.response ??
        result?.choices?.[0]?.message?.content ??
        result?.choices?.[0]?.text ??
        "";

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: text } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    } catch (error) {
      const message = error?.message || "Workers AI inference failed";
      return new Response(
        JSON.stringify({ errors: [{ message }] }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }
  },
};
