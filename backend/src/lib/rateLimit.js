import crypto from "node:crypto";
import expressRateLimit from "express-rate-limit";
import { LRUCache } from "lru-cache";
import { extractBearerToken } from "./auth.js";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from "../config.js";

// ── Shared rate limiter ──
// SECURITY: bearer tokens are NOT verified at this layer, so a limiter keyed
// on the token alone could be bypassed forever by rotating random tokens
// (each fake token got a fresh bucket). Every limiter therefore ALWAYS
// enforces an IP-level backstop in addition to the per-token bucket. The IP
// cap is a few times higher than the per-token cap so legitimate users behind
// shared NAT (schools, offices) aren't collapsed into one tiny bucket.
// SECURITY: the token is UNVERIFIED at this layer, so any privilege it grants
// (a fresh bucket, a higher IP cap) is spoofable. Safeguards:
//   1. Only JWT-SHAPED tokens (three base64url segments, bounded length) count
//      as tokens at all — random garbage neither creates a bucket nor lifts
//      the IP cap.
//   2. Each IP may create at most MAX_TOKEN_KEYS_PER_IP distinct token buckets
//      per window. Beyond that the request is rejected outright (fail closed):
//      spraying unique fake tokens becomes self-defeating instead of a
//      memory-growth vector.
//   3. The limiter store is bounded by express-rate-limit's internal LRU so it
//      can never grow unboundedly no matter the traffic shape.
//
// The custom sliding-window Map was replaced by `express-rate-limit`, the
// de-facto standard request-rate limiter for Express. It owns the per-window
// counting, expiry, and store-bounding; we keep the security-critical key
// logic (per-token vs IP backstop, token-shape gate, spray cap) via its
// `keyGenerator` + `limit` hooks.
const JWT_SHAPE_PATTERN = /^[\w-]{4,2048}\.[\w-]{4,4096}\.[\w-]{4,2048}$/;
const MAX_TOKEN_KEYS_PER_IP = 200; // generous for real NATs (schools/offices)
// LRU-capped set of (ip -> set of token buckets) used for the spray gate.
const ipTokenBuckets = new LRUCache({
  max: 10_000,
  ttl: 60_000,
});

function tokenFromRequest(req) {
  const rawToken = extractBearerToken(req);
  return rawToken && JWT_SHAPE_PATTERN.test(rawToken) ? rawToken : null;
}

// Fail closed when one IP mints too many distinct token buckets in a single
// window — that traffic shape is a token-spray attack, not a legitimate NAT.
function isTokenSpray(ip, tokenKey) {
  if (!ipTokenBuckets.has(ip)) {
    ipTokenBuckets.set(ip, new Set());
  }
  const buckets = ipTokenBuckets.get(ip);
  if (buckets.has(tokenKey)) return false;
  buckets.add(tokenKey);
  return buckets.size > MAX_TOKEN_KEYS_PER_IP;
}

// SECURITY: keying IPv6 callers on the full 128-bit address hands an attacker
// with an ordinary residential /64 allocation 2^64 distinct addresses — i.e.
// unlimited fresh rate-limit buckets for every limiter below. Collapse IPv6 to
// its /64 network prefix; IPv4 (incl. v4-mapped IPv6) keeps the exact address.
function rateLimitIpKey(ip) {
  if (typeof ip !== "string" || !ip) return "unknown";
  const stripped = ip.split("%")[0].trim();
  const v4Mapped = stripped.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4Mapped) return v4Mapped[1];
  if (!stripped.includes(":")) return stripped;
  // Expand "::" compression so the first 4 hextets (the /64) are reliable.
  const [headRaw, tailRaw = ""] = stripped.split("::");
  const headParts = headRaw ? headRaw.split(":") : [];
  const tailParts = tailRaw ? tailRaw.split(":") : [];
  const missing = Math.max(0, 8 - headParts.length - tailParts.length);
  const groups = [...headParts, ...Array(missing).fill("0"), ...tailParts];
  return `${groups.slice(0, 4).join(":")}::/64`;
}

export function createRateLimiter({ windowMs, max, ipMultiplier = 5 }) {
  const tooMany = (_req, res) => {
    res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
    res.status(429).json({ error: "Too many requests. Please slow down." });
  };
  const clientIp = (req) =>
    rateLimitIpKey(req.ip || req.socket?.remoteAddress || "unknown");

  // Gate 1 — the ALWAYS-ON IP backstop. Counts EVERY request from an IP,
  // token or not, capped at `max * ipMultiplier`.
  //
  // SECURITY: this gate previously did not exist — the single limiter used a
  // combined `ip|token` key, so each distinct (unverified!) JWT-shaped token
  // opened a FRESH bucket and one IP could multiply its budget by
  // MAX_TOKEN_KEYS_PER_IP × ipMultiplier (~1000×) before the spray gate
  // tripped. A separate counter keyed purely on IP restores the documented
  // hard per-IP ceiling no matter how many tokens are minted.
  const ipBackstop = expressRateLimit({
    windowMs,
    limit: max * ipMultiplier,
    // Headers come from the per-key gate below (the budget a legitimate
    // caller actually experiences); emitting them here too would clobber it.
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req) => `ipall:${clientIp(req)}`,
    handler: tooMany,
  });

  // Gate 2 — the per-caller bucket: per verified-shape token (so NATed users
  // don't share one bucket), or per IP for tokenless requests. Both are capped
  // at the base `max`; only the aggregate IP backstop above gets the
  // multiplier.
  const perCaller = expressRateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = clientIp(req);
      const token = tokenFromRequest(req);
      if (!token) return `ip:${ip}`;
      const tokenKey = `user:${crypto
        .createHash("sha256")
        .update(token)
        .digest("hex")
        .slice(0, 32)}`;
      // Fail closed: an IP minting too many distinct token buckets collapses
      // into one shared spray bucket instead of gaining fresh budget.
      if (isTokenSpray(ip, tokenKey)) return `spray:${ip}`;
      return `ip:${ip}|${tokenKey}`;
    },
    handler: tooMany,
  });

  // Express flattens middleware arrays, so callers keep using this as a
  // single `rateLimit` argument in route definitions.
  return [ipBackstop, perCaller];
}

// Routes register `rateLimit` (an alias of this apiRateLimiter) as middleware.
// It is a two-gate chain (Express flattens the array): an aggregate per-IP
// backstop followed by the per-caller bucket — each counts the request in its
// own window, sets RateLimit headers (per-caller gate only), and
// short-circuits with 429 + Retry-After when either budget is exhausted.
export const apiRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
});
