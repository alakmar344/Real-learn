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
  await t.test("privacy re-consent lists only the current v3.3 Find-feature changes", () => {
    const policy = extractArray("POLICY_CHANGES");
    assert.match(policy, /version 3\.3/i);
    assert.match(policy, /\bFind\b/);
    assert.match(policy, /on your device/i);
    assert.match(policy, /discover related lessons|topic labels/i);
    assert.match(policy, /not stored|never stored/i);
    // Stale bullets from earlier bumps must not linger.
    assert.doesNotMatch(policy, /version 3\.2|version 3\.1|version 3\.0|version 2\.9|email address|Serper|moderation logs|transfer|safeguards|feedback/i);
  });

  await t.test("terms re-consent lists the current v3.0 Find-feature changes", () => {
    const terms = extractArray("TERMS_CHANGES");
    assert.match(terms, /version 3\.0/i);
    assert.match(terms, /\bFind\b/);
    assert.match(terms, /discover related lessons|topic labels/i);
    assert.match(terms, /as is|suggestions only/i);
    // Stale bullets from earlier bumps must not linger.
    assert.doesNotMatch(terms, /version 2\.9|version 2\.8|version 2\.7|last-resort|Gemma model|30-day|entire agreement|no waiver|third-party beneficiaries|force majeure/i);
  });
});
