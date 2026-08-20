import { test } from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../src/server.js";

test("Fastify server builds, registers all hooks/plugins, and boots ready", async () => {
  const fastify = buildServer();
  await fastify.ready();

  // Test GET /health
  const healthRes = await fastify.inject({
    method: "GET",
    url: "/health",
  });
  assert.ok(healthRes.statusCode === 200 || healthRes.statusCode === 503);
  const healthJson = JSON.parse(healthRes.payload);
  assert.ok(healthJson.version);
  assert.ok(healthJson.dependencies);

  // Test GET /api/ready
  const readyRes = await fastify.inject({
    method: "GET",
    url: "/api/ready",
  });
  assert.equal(readyRes.statusCode, 200);
  const readyJson = JSON.parse(readyRes.payload);
  assert.equal(readyJson.ok, true);
  assert.deepEqual(readyJson.modes, ["fast", "explain"]);

  // Test unauthenticated /api/generate-lesson returns 401
  const lessonRes = await fastify.inject({
    method: "POST",
    url: "/api/generate-lesson",
    payload: { question: "What is photosynthesis?" },
  });
  assert.equal(lessonRes.statusCode, 401);

  // Test unmatched route returns JSON 404
  const notFoundRes = await fastify.inject({
    method: "GET",
    url: "/api/unknown-endpoint-xyz",
  });
  assert.equal(notFoundRes.statusCode, 404);
  const notFoundJson = JSON.parse(notFoundRes.payload);
  assert.equal(notFoundJson.error, "Not found");

  await fastify.close();
});
