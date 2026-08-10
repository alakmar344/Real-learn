# Whole-site smoke test

`integration-smoke.sh` boots the real backend + the production frontend and
exercises RealLearn end to end — from the browser-facing routes down to the new
`/api/find` "Find" endpoint — so a regression anywhere in the request path is
caught before shipping.

## Run

```bash
# 1. Install deps + build the frontend once
(cd backend && npm install)
(cd frontend && npm install && npm run build)

# 2. Run the smoke test
bash scripts-smoke/integration-smoke.sh
```

## What it checks

- **Backend** boots and `/health` responds.
- **`POST /api/find`** is reachable and correctly requires authentication (401).
- **Frontend** home renders, the nav links to `/find`, and the Privacy/Terms
  pages show the bumped legal versions (privacy v3.3, terms v3.0) with the Find
  disclosure.
- **`/find`** is auth-gated: an unauthenticated request redirects (3xx) to
  sign-in — never 500/404.

## Credentials

Set `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to real Clerk keys
for full coverage. Without a valid secret key, `@clerk/nextjs` middleware throws
on every request, so the SSR checks are reported as **skip** (not fail); the
backend and route-guard checks still run.

## Fast unit-level checks (no servers)

```bash
(cd backend && node --test)                 # 46 tests incl. frontier.test.js
(cd frontend && npm run verify:frontier)    # knowledge-frontier engine
(cd frontend && npm run verify:reconsent)   # legal re-consent copy vs versions
(cd frontend && npm run verify:achievements && npm run verify:quiz)
```
