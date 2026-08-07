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
  await t.test("privacy re-consent lists only the current v3.1 children's privacy/GDPR/DPDP/security/grievance changes", () => {
    const policy = extractArray("POLICY_CHANGES");
    assert.match(policy, /version 3\.1/i);
    assert.match(policy, /children/i);
    assert.match(policy, /GDPR|legal bases/i);
    assert.match(policy, /DPDP/i);
    assert.match(policy, /grievance/i);
    // Stale bullets from earlier bumps must not linger.
    assert.doesNotMatch(policy, /version 3\.0|version 2\.9|version 2\.8|since v2\.4|since v2\.3|feedback|personalization|MongoDB Atlas|IP addresses are anonymized/i);
  });

  await t.test("terms re-consent lists the current v2.8 dispute/force majeure/export/service availability changes", () => {
    const terms = extractArray("TERMS_CHANGES");
    assert.match(terms, /version 2\.8/i);
    assert.match(terms, /dispute|mediation|Mandsaur/i);
    assert.match(terms, /force majeure|export|sanctions|suspension/i);
    assert.doesNotMatch(terms, /version 2\.7|version 2\.6|Version 2\.5|feedback|personalization|saved lesson history|unchanged/i);
  });
});
