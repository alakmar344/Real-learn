// frontend/scripts/verify-i18n.mjs
import { DICTIONARIES } from "../lib/i18n.ts";

const languages = Object.keys(DICTIONARIES);
console.log(`Verifying internationalization for all ${languages.length} languages...`);

const baseDict = DICTIONARIES["English"];
if (!baseDict) {
  throw new Error("English base dictionary missing!");
}

const baseKeys = Object.keys(baseDict);
console.log(`Base English dictionary contains ${baseKeys.length} keys.`);

let totalMissing = 0;
for (const lang of languages) {
  const dict = DICTIONARIES[lang];
  if (!dict) {
    console.error(`❌ Dictionary missing for language: ${lang}`);
    totalMissing++;
    continue;
  }
  const missingKeys = baseKeys.filter((k) => !dict[k]);
  if (missingKeys.length > 0) {
    console.warn(`⚠️ ${lang} is missing ${missingKeys.length} keys: ${missingKeys.slice(0, 3).join(", ")}...`);
    totalMissing++;
  }
}

if (totalMissing === 0) {
  console.log(`✅ PASS — All ${languages.length} languages have complete, valid dictionaries with all ${baseKeys.length} keys.`);
} else {
  process.exit(1);
}
