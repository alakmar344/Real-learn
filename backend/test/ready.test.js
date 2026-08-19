import { test } from "node:test";
import assert from "node:assert/strict";

const { readyHandler } = await import("../src/routes/ready.js");

function mockRes() {
  return {
    headers: {},
    statusCode: null,
    jsonBody: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
  };
}

test("readyHandler returns public capabilities", () => {
  const res = mockRes();
  readyHandler({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonBody.ok, true);
  assert.ok(typeof res.jsonBody.version === "string");
  assert.deepEqual(res.jsonBody.modes, ["fast", "explain"]);
  assert.ok(Array.isArray(res.jsonBody.languages));
  assert.ok(res.jsonBody.languages.includes("English"));
  assert.ok(Array.isArray(res.jsonBody.levels));
  assert.ok(res.jsonBody.levels.includes("Class 9-10"));
  assert.equal(res.jsonBody.limits.maxQuestionLength, 1000);
  assert.ok(res.jsonBody.policies.privacy);
  assert.ok(res.jsonBody.policies.terms);
  assert.ok(res.jsonBody.ai.status);
  assert.ok(res.headers["Cache-Control"].includes("max-age=30"));
});
