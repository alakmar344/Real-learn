import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeSearchQuery } from "../src/lib/searchIndex.js";

test("sanitizeSearchQuery normalizes whitespace and strips risky characters", () => {
  assert.equal(sanitizeSearchQuery("  photosynthesis\n<alert>   basics  "), "photosynthesis alert basics");
  assert.equal(sanitizeSearchQuery("\u0000black\u0008 holes"), "black holes");
});

test("sanitizeSearchQuery rejects non-string input and caps length", () => {
  assert.equal(sanitizeSearchQuery(null), "");
  assert.equal(sanitizeSearchQuery({ q: "math" }), "");
  assert.equal(sanitizeSearchQuery("x".repeat(500)).length, 160);
});
