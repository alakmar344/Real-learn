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
  await t.test("privacy re-consent lists only the current v3.6 AI provider changes", () => {
    const policy = extractArray("POLICY_CHANGES");
    assert.match(policy, /version 3\.6/i);
    assert.match(policy, /Mistral/i);
    assert.match(policy, /Groq/i);
    assert.match(policy, /NVIDIA/i);
    assert.match(policy, /Cloudflare/i);
    assert.match(policy, /train|fine-tune/i);
    // Stale bullets from earlier bumps must not linger.
    assert.doesNotMatch(
      policy,
      /version 3\.5|version 3\.4|version 3\.3|version 3\.2|version 3\.1(?!\d)|version 3\.0|version 2\.9|email address|Serper|moderation logs|transfer|safeguards|feedback|discover related lessons/i
    );
  });

  await t.test("terms re-consent lists the current v3.3 AI provider changes", () => {
    const terms = extractArray("TERMS_CHANGES");
    assert.match(terms, /version 3\.3/i);
    assert.match(terms, /Mistral/i);
    assert.match(terms, /Groq/i);
    assert.match(terms, /NVIDIA/i);
    assert.match(terms, /Cloudflare/i);
    assert.match(terms, /as is/i);
    // Stale bullets from earlier bumps must not linger.
    assert.doesNotMatch(
      terms,
      /version 3\.2|version 3\.1(?!\d)|version 3\.0|version 2\.9|version 2\.8|version 2\.7|Gemma model|30-day|entire agreement|no waiver|third-party beneficiaries|force majeure/i
    );
  });
});
