import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../components/shared/PreSignInConsent.tsx", import.meta.url), "utf8");

function extractArray(name) {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  assert.ok(match, `${name} must exist`);
  return match[1];
}

test("re-consent change summary", async (t) => {
  await t.test("privacy re-consent lists only the current v3.0 hosting/data-minimization changes", () => {
    const policy = extractArray("POLICY_CHANGES");
    assert.match(policy, /version 3\.0/i);
    assert.match(policy, /Vercel/);
    assert.match(policy, /Render/);
    assert.match(policy, /data minimization/i);
    // Stale bullets from earlier bumps must not linger.
    assert.doesNotMatch(policy, /version 2\.9|version 2\.8|since v2\.4|since v2\.3|feedback|personalization|MongoDB Atlas|IP addresses are anonymized/i);
  });

  await t.test("terms re-consent states the ToS are unchanged at v2.7", () => {
    const terms = extractArray("TERMS_CHANGES");
    assert.match(terms, /version 2\.7/i);
    assert.match(terms, /unchanged/i);
    assert.doesNotMatch(terms, /version 2\.6|Version 2\.5|feedback|personalization|saved lesson history/i);
  });
});
