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
  await t.test("privacy re-consent lists only the current NVIDIA provider-routing change", () => {
    const policy = extractArray("POLICY_CHANGES");
    assert.match(policy, /version 2\.9/i);
    assert.match(policy, /NVIDIA NIM/);
    assert.match(policy, /Cerebras/);
    assert.match(policy, /Cloudflare Workers AI/);
    assert.doesNotMatch(policy, /version 2\.8|since v2\.4|since v2\.3|feedback|personalization|MongoDB Atlas|IP addresses are anonymized/i);
  });

  await t.test("terms re-consent lists only the current NVIDIA provider-routing change", () => {
    const terms = extractArray("TERMS_CHANGES");
    assert.match(terms, /version 2\.7/i);
    assert.match(terms, /NVIDIA NIM/);
    assert.match(terms, /Cerebras/);
    assert.match(terms, /Cloudflare Workers AI/);
    assert.doesNotMatch(terms, /version 2\.6|Version 2\.5|feedback|personalization|saved lesson history/i);
  });
});
