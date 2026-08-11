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
  await t.test("privacy re-consent lists only the current v3.4 personalization-layer changes", () => {
    const policy = extractArray("POLICY_CHANGES");
    assert.match(policy, /version 3\.4/i);
    assert.match(policy, /personalization layer|learning profile|learning-context/i);
    assert.match(policy, /on your device/i);
    assert.match(policy, /not stored|never stored/i);
    assert.match(policy, /one-way hash|hash/i);
    // Stale bullets from earlier bumps must not linger.
    assert.doesNotMatch(
      policy,
      /version 3\.3|version 3\.2|version 3\.1(?!\d)|version 3\.0|version 2\.9|email address|Serper|moderation logs|transfer|safeguards|feedback|discover related lessons/i
    );
  });

  await t.test("terms re-consent lists the current v3.1 personalization-layer changes", () => {
    const terms = extractArray("TERMS_CHANGES");
    assert.match(terms, /version 3\.1/i);
    assert.match(terms, /personalization layer|learning profile|learning-context/i);
    assert.match(terms, /as is|suggestions only/i);
    // Stale bullets from earlier bumps must not linger.
    // NOTE: "discover related lessons" is intentionally allowed here because the
    // v3.1 bullet legitimately references the removed Find search by name.
    assert.doesNotMatch(
      terms,
      /version 3\.0|version 2\.9|version 2\.8|version 2\.7|last-resort|Gemma model|30-day|entire agreement|no waiver|third-party beneficiaries|force majeure/i
    );
  });
});
