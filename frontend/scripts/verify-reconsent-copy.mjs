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
  await t.test("privacy re-consent lists only the current v3.2 email-removal/Serper-scope/moderation-log/tightening changes", () => {
    const policy = extractArray("POLICY_CHANGES");
    assert.match(policy, /version 3\.2/i);
    assert.match(policy, /email address/i);
    assert.match(policy, /Serper|Explain mode/i);
    assert.match(policy, /moderation logs/i);
    assert.match(policy, /transfer|safeguards/i);
    // Stale bullets from earlier bumps must not linger.
    assert.doesNotMatch(policy, /version 3\.1|version 3\.0|version 2\.9|version 2\.8|since v2\.4|since v2\.3|feedback|GDPR legal-bases|grievance-officer contact|MongoDB Atlas|IP addresses are anonymized/i);
  });

  await t.test("terms re-consent lists the current v2.9 model-variant/notice/protective-clause changes", () => {
    const terms = extractArray("TERMS_CHANGES");
    assert.match(terms, /version 2\.9/i);
    assert.match(terms, /last-resort|Gemma model/i);
    assert.match(terms, /30-day|re-consent/i);
    assert.match(terms, /entire agreement|no waiver|third-party beneficiaries|time limit/i);
    assert.doesNotMatch(terms, /version 2\.8|version 2\.7|version 2\.6|Version 2\.5|feedback|Mandsaur|force majeure|saved lesson history|unchanged/i);
  });
});
