import { test } from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../src/server.js";
import { flushSseHeaders } from "../src/lib/sse.js";
import { isOriginAllowed } from "../src/middleware/security.js";

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

test("CORS origin validation and preflight handling across environments", async () => {
  const fastify = buildServer();
  await fastify.ready();

  // 1. Allowed production origin returns CORS header on GET
  const readyProd = await fastify.inject({
    method: "GET",
    url: "/api/ready",
    headers: { origin: "https://reallearn.site" },
  });
  assert.equal(readyProd.statusCode, 200);
  assert.equal(readyProd.headers["access-control-allow-origin"], "https://reallearn.site");

  // 2. Allowed production origin returns CORS header on OPTIONS preflight
  const preflightProd = await fastify.inject({
    method: "OPTIONS",
    url: "/api/generate-lesson",
    headers: {
      origin: "https://www.reallearn.site",
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization, content-type",
    },
  });
  assert.equal(preflightProd.statusCode, 204);
  assert.equal(preflightProd.headers["access-control-allow-origin"], "https://www.reallearn.site");
  assert.ok(preflightProd.headers["access-control-allow-methods"]?.includes("POST"));

  // 3. Unauthorized origin (including vercel.app and localhost) does not receive CORS allow header
  const preflightVercel = await fastify.inject({
    method: "OPTIONS",
    url: "/api/generate-lesson",
    headers: {
      origin: "https://real-learn-preview-123.vercel.app",
      "access-control-request-method": "POST",
    },
  });
  assert.equal(preflightVercel.headers["access-control-allow-origin"], undefined);

  // 4. POST /api/generate-lesson with origin carries CORS headers even on 401
  const lessonCors = await fastify.inject({
    method: "POST",
    url: "/api/generate-lesson",
    headers: { origin: "https://reallearn.site" },
    payload: { question: "What is quantum mechanics?" },
  });
  assert.equal(lessonCors.statusCode, 401);
  assert.equal(lessonCors.headers["access-control-allow-origin"], "https://reallearn.site");

  await fastify.close();
});

test("isOriginAllowed strictly allows only trusted production origins", () => {
  assert.equal(isOriginAllowed("https://reallearn.site"), true);
  assert.equal(isOriginAllowed("https://www.reallearn.site"), true);
  assert.equal(isOriginAllowed("https://real-learn.onrender.com"), true);
  assert.equal(isOriginAllowed("https://reallearn-taupe.vercel.app"), false);
  assert.equal(isOriginAllowed("https://real-learn-preview-123.vercel.app"), false);
  assert.equal(isOriginAllowed("http://localhost:3000"), false);
  assert.equal(isOriginAllowed("https://evil-attacker.com"), false);
  assert.equal(isOriginAllowed("https://malicious-site.org"), false);
});

test("flushSseHeaders sets complete SSE, CORS, and security headers on hijacked streams", () => {
  const headers = {};
  let flushed = false;
  const mockRes = {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    flushHeaders() {
      flushed = true;
    },
  };
  const mockReq = {
    headers: {
      origin: "https://reallearn.site",
    },
  };

  flushSseHeaders(mockRes, mockReq);
  assert.equal(flushed, true);
  assert.equal(headers["content-type"], "text/event-stream; charset=utf-8");
  assert.equal(headers["cache-control"], "no-cache, no-transform");
  assert.equal(headers["connection"], "keep-alive");
  assert.equal(headers["x-accel-buffering"], "no");
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["x-frame-options"], "DENY");
  assert.equal(headers["access-control-allow-origin"], "https://reallearn.site");
  assert.equal(headers["access-control-allow-credentials"], "true");
  assert.equal(headers["vary"], "Origin");
});
