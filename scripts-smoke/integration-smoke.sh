#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RealLearn whole-site integration smoke test.
#
# Boots the REAL backend + the production frontend and exercises the site end to
# end — browser-facing routes plus the authenticated API surface — so a
# regression anywhere in the request path is caught before shipping.
#
# Everything runs inside ONE shell invocation so the servers stay alive for the
# duration of the checks, then are torn down on exit.
#
#   Usage:  bash scripts-smoke/integration-smoke.sh
#
# Real credentials (optional but recommended for full coverage):
#   CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — without a VALID Clerk
#   secret key, @clerk/nextjs middleware throws on every request, so the
#   frontend SSR checks are reported as SKIP (not FAIL). The backend checks
#   always run.
#
# Prereqs: `npm install` in both backend/ and frontend/, and a frontend build
#          (`npm run build`) so .next exists for `next start`.
# ─────────────────────────────────────────────────────────────────────────────
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0; FAIL=0; SKIP=0
ok()   { echo "  ok    $1"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
skip() { echo "  skip  $1"; SKIP=$((SKIP+1)); }

BACK_PID=""; FRONT_PID=""
cleanup() {
  [ -n "$BACK_PID" ]  && kill "$BACK_PID"  2>/dev/null
  [ -n "$FRONT_PID" ] && kill "$FRONT_PID" 2>/dev/null
}
trap cleanup EXIT

mkdir -p /tmp/logs
BACK_PORT="${BACK_PORT:-10011}"
# 3000 is a common dev-proxy port (and was silently occupied in CI sandboxes,
# making the checks probe a foreign server) — default to an uncommon port.
FRONT_PORT="${FRONT_PORT:-3907}"

# ── Boot backend (a dummy AI key satisfies startup config; DB may be absent) ──
cd "$ROOT/backend"
GROQ_API_KEY="${GROQ_API_KEY:-dummy-smoke-key}" PORT="$BACK_PORT" \
  node src/server.js > /tmp/logs/smoke-backend.log 2>&1 &
BACK_PID=$!

# ── Boot frontend (standalone production server) ──
cd "$ROOT/frontend"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_Y2xlcmsuZXhhbXBsZS5jb20k}"
export CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-sk_test_smoke0000000000000000000000000000}"
export NEXT_PUBLIC_BACKEND_URL="http://localhost:${BACK_PORT}"
export NEXT_TELEMETRY_DISABLED=1
if [ -d .next ]; then
  # NOTE: do NOT pass `-H 127.0.0.1` — under Next 16 an explicit loopback
  # bind breaks the router's internal dispatch for app routes (requests to
  # proxied routes hang; static files still serve). Default bind (0.0.0.0)
  # works and 127.0.0.1 URLs reach it fine.
  npx next start -p "$FRONT_PORT" > /tmp/logs/smoke-frontend.log 2>&1 &
  FRONT_PID=$!
else
  echo "  (no .next build — run 'npm run build' first; skipping frontend boot)"
fi

# ── Wait for readiness ──
for _ in $(seq 1 30); do curl -s -m2 -o /dev/null "http://localhost:$BACK_PORT/health" && break; sleep 1; done
if [ -n "$FRONT_PID" ]; then
  for _ in $(seq 1 40); do
    c=$(curl -s -m2 -o /dev/null -w "%{http_code}" "http://127.0.0.1:$FRONT_PORT/" 2>/dev/null || echo 000)
    [ "$c" != "000" ] && break; sleep 1
  done
fi

echo "── Backend ──"
H=$(curl -s -m5 -o /dev/null -w "%{http_code}" "http://localhost:$BACK_PORT/health")
if [ "$H" = "200" ] || [ "$H" = "503" ]; then ok "backend /health responds ($H)"; else bad "backend /health ($H)"; fi

# The lesson-generation endpoint is the core API surface — unauthenticated
# calls must be rejected, never 404/500. (The old /api/find check was removed
# with the Find feature itself.)
G=$(curl -s -m5 -o /dev/null -w "%{http_code}" -X POST "http://localhost:$BACK_PORT/api/generate-lesson" \
      -H "Content-Type: application/json" -d '{"question":"smoke test"}')
if [ "$G" = "401" ] || [ "$G" = "403" ]; then ok "POST /api/generate-lesson requires auth ($G)"; else bad "POST /api/generate-lesson expected 401/403, got $G"; fi

echo "── Frontend ──"
if [ -z "$FRONT_PID" ]; then
  skip "frontend not booted"
else
  HOME_CODE=$(curl -s -m8 -o /dev/null -w "%{http_code}" "http://127.0.0.1:$FRONT_PORT/")
  CLERK_OK=1
  grep -qi "Missing secretKey" /tmp/logs/smoke-frontend.log && CLERK_OK=0
  if [ "$CLERK_OK" = "0" ]; then
    skip "SSR checks — no valid CLERK_SECRET_KEY in this environment (middleware throws on every route)"
  else
    if [ "$HOME_CODE" = "200" ]; then ok "home / renders (200)"; else bad "home / ($HOME_CODE)"; fi
    curl -s -m8 "http://127.0.0.1:$FRONT_PORT/" | grep -q "<title>RealLearn" && ok "home SSR title present" || bad "home SSR title missing"
    # Legal-doc versions come from lib/legalConsent.ts — never hardcode them
    # here again (the old hardcoded 3.3/3.0 checks silently went stale).
    PV=$(grep -o 'CURRENT_PRIVACY_VERSION = "[0-9.]*"' "$ROOT/frontend/lib/legalConsent.ts" | grep -o '[0-9.]*')
    TV=$(grep -o 'CURRENT_TERMS_VERSION = "[0-9.]*"' "$ROOT/frontend/lib/legalConsent.ts" | grep -o '[0-9.]*')
    B=$(curl -s -m8 "http://127.0.0.1:$FRONT_PORT/legal/privacy/")
    echo "$B" | grep -q "version $PV" && ok "privacy shows version $PV" || bad "privacy missing version $PV"
    T=$(curl -s -m8 "http://127.0.0.1:$FRONT_PORT/legal/terms/")
    echo "$T" | grep -q "version $TV" && ok "terms shows version $TV" || bad "terms missing version $TV"
    R=$(curl -s -m8 -o /dev/null -w "%{http_code}" "http://127.0.0.1:$FRONT_PORT/robots.txt")
    [ "$R" = "200" ] && ok "robots.txt (200)" || bad "robots.txt ($R)"
  fi
fi

echo ""
echo "SMOKE SUMMARY: $PASS passed, $FAIL failed, $SKIP skipped"
[ "$FAIL" = "0" ] && { echo "INTEGRATION PASS"; exit 0; } || { echo "INTEGRATION FAIL"; exit 1; }
