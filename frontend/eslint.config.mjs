// ESLint 10 flat config. Next.js 16 removed `next lint`, so `npm run lint`
// now invokes ESLint directly against this file.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    rules: {
      // This codebase deliberately uses the `setMounted(true)`-in-effect
      // hydration-gating pattern on every persisted-store surface (see
      // AGENT_MEMORY §7) to avoid SSR markup mismatches with Zustand
      // persist. The React-Compiler-era rule flags that pattern wholesale;
      // keep it visible as a warning, but not build-breaking.
      "react-hooks/set-state-in-effect": "warn",
      // `const { lesson: _lesson, ...rest } = obj` is the idiomatic way to
      // omit a key; a leading underscore marks the intentionally-unused slot.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
];

export default config;
