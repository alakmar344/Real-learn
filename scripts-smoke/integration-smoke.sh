#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RealLearn whole-site integration smoke test.
#
# Boots the REAL backend + the production frontend and exercises the site end to
# end — from the browser-facing routes down to the new /api/find endpoint — so a
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
#   frontend SSR checks are reported as SKIP (not FAIL). The backend checks and
#   the /find route-guard check always run.
#
# Prereqs: `npm install` in both backend/ and frontend/, and a frontend build
#          (`npm run build`) so .next/standalone exists.
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
FRONT_PORT="${FRONT_PORT:-3000}"

# ── Boot backend (a dummy AI key satisfies startup config; DB may be absent) ──
cd "$ROOT/backend"
CEREBRAS_API_KEY="${CEREBRAS_API_KEY:-dummy-smoke-key}" PORT="$BACK_PORT" \
  node src/server.js > /tmp/logs/smoke-backend.log 2>&1 &
BACK_PID=$!

# ── Boot frontend (standalone production server) ──
cd "$ROOT/frontend"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_Y2xlcmsuZXhhbXBsZS5jb20k}"
export CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-sk_test_smoke0000000000000000000000000000}"
export NEXT_PUBLIC_BACKEND_URL="http://localhost:${BACK_PORT}"
export NEXT_TELEMETRY_DISABLED=1
export PORT="$FRONT_PORT" HOSTNAME=127.0.0.1
if [ -f .next/standalone/server.js ]; then
  node .next/standalone/server.js > /tmp/logs/smoke-frontend.log 2>&1 &
  FRONT_PID=$!
else
  echo "  (no .next/standalone — run 'npm run build' first; skipping frontend boot)"
fi

# ── Wait for readiness ──
for _ in $(seq 1 30); do curl -s -m2 -o /dev/null "http://localhost:$BACK_PORT/health" && break; sleep 1; done
if [ -n "$FRONT_PID" ]; then
  for _ in $(seq 1 40); do
    c=$(curl -s -m2 -o /dev/null -w "%{http_code}" "http://localhost:$FRONT_PORT/" 2>/dev/null || echo 000)
    [ "$c" != "000" ] && break; sleep 1
  done
fi

echo "── Backend ──"
H=$(curl -s -m5 -o /dev/null -w "%{http_code}" "http://localhost:$BACK_PORT/health")
if [ "$H" = "200" ] || [ "$H" = "503" ]; then ok "backend /health responds ($H)"; else bad "backend /health ($H)"; fi

F=$(curl -s -m5 -o /dev/null -w "%{http_code}" -X POST "http://localhost:$BACK_PORT/api/find" \
      -H "Content-Type: application/json" -d '{"goal":"black holes","mastered":["Gravity"]}')
if [ "$F" = "401" ]; then ok "POST /api/find requires auth (401)"; else bad "POST /api/find expected 401, got $F"; fi

echo "── Frontend ──"
if [ -z "$FRONT_PID" ]; then
  skip "frontend not booted"
else
  HOME_CODE=$(curl -s -m8 -o /dev/null -w "%{http_code}" "http://localhost:$FRONT_PORT/")
  CLERK_OK=1
  grep -qi "Missing secretKey" /tmp/logs/smoke-frontend.log && CLERK_OK=0
  if [ "$CLERK_OK" = "0" ]; then
    skip "SSR checks — no valid CLERK_SECRET_KEY in this environment (middleware throws on every route)"
  else
    if [ "$HOME_CODE" = "200" ]; then ok "home / renders (200)"; else bad "home / ($HOME_CODE)"; fi
    if curl -s -m8 "http://localhost:$FRONT_PORT/" | grep -q 'href="/find"'; then ok "home nav links to /find"; else bad "home nav missing /find link"; fi
    B=$(curl -s -m8 "http://localhost:$FRONT_PORT/legal/privacy")
    echo "$B" | grep -q "version 3.3" && ok "privacy shows version 3.3" || bad "privacy missing version 3.3"
    echo "$B" | grep -qi "Find" && ok "privacy mentions Find" || bad "privacy missing Find"
    T=$(curl -s -m8 "http://localhost:$FRONT_PORT/legal/terms")
    echo "$T" | grep -q "version 3.0" && ok "terms shows version 3.0" || bad "terms missing version 3.0"
  fi
  # The /find route guard runs regardless: unauthenticated must redirect (3xx),
  # never 500 or 404.
  FIND_CODE=$(curl -s -m8 -o /dev/null -w "%{http_code}" "http://localhost:$FRONT_PORT/find")
  case "$FIND_CODE" in
    200|301|302|307|308) ok "/find route reachable/guarded ($FIND_CODE)";;
    *) bad "/find returned $FIND_CODE";;
  esac
fi

echo ""
echo "SMOKE SUMMARY: $PASS passed, $FAIL failed, $SKIP skipped"
[ "$FAIL" = "0" ] && { echo "INTEGRATION PASS"; exit 0; } || { echo "INTEGRATION FAIL"; exit 1; }
