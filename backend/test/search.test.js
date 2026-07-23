import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SKIP_SERVER_START = "true";

// ── Unit: ensureSearchIndex builds the expected text index spec ─────────────

import { ensureSearchIndex } from "../src/lib/lessonCache.js";

test("ensureSearchIndex calls createIndex with text spec", async () => {
  const specs = [];
  const collection = {
    createIndex: async (spec, opts) => {
      specs.push({ spec, opts });
    },
  };
  const db = { collection: () => collection };

  await ensureSearchIndex(db);
  assert.equal(specs.length, 1, "createIndex should be called once");
  const [{ spec }] = specs;
  assert.equal(spec["lesson.title"], "text");
  assert.equal(spec["lesson.keyTakeaways"], "text");
  assert.equal(spec["lesson.content"], "text");
});

// ── Smoke: new route is registered on the Express app ──────────────────────

import { app } from "../src/server.js";

function findRoute(path) {
  const stack = app._router?.stack || [];
  for (const layer of stack) {
    if (layer.route?.path === path && layer.route?.methods?.get) {
      return true;
    }
  }
  return false;
}

test("/api/search-lessons route exists", () => {
  assert.ok(findRoute("/api/search-lessons"), "search route not registered");
});
