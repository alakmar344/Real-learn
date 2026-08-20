import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { extractBearerToken } from "./auth.js";
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from "../config.js";

// ── Shared rate limiter ──
// High-performance, zero-overhead in-memory rate limiter for Fastify.
// Enforces a dual-gate architecture:
//   1. An aggregate IP backstop (capped at max * ipMultiplier)
//   2. A per-caller bucket (per JWT-shaped token or per-IP for anonymous requests)
//   3. A token-spray gate that fails closed if one IP generates too many distinct JWT buckets.

const JWT_SHAPE_PATTERN = /^[\w-]{4,2048}\.[\w-]{4,4096}\.[\w-]{4,2048}$/;
const MAX_TOKEN_KEYS_PER_IP = 200;

const ipTokenBuckets = new LRUCache({
  max: 10_000,
  ttl: 60_000,
});

function tokenFromRequest(req) {
  const rawToken = extractBearerToken(req);
  return rawToken && JWT_SHAPE_PATTERN.test(rawToken) ? rawToken : null;
}

function isTokenSpray(ip, tokenKey) {
  if (!ipTokenBuckets.has(ip)) {
    ipTokenBuckets.set(ip, new Set());
  }
  const buckets = ipTokenBuckets.get(ip);
  if (buckets.has(tokenKey)) return false;
  buckets.add(tokenKey);
  return buckets.size > MAX_TOKEN_KEYS_PER_IP;
}

export function rateLimitIpKey(ip) {
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
  const ipStore = new LRUCache({ max: 50_000, ttl: windowMs });
  const callerStore = new LRUCache({ max: 50_000, ttl: windowMs });

  const limiterHook = async (req, reply, next) => {
    const rawIp = req.ip || req.raw?.socket?.remoteAddress || req.socket?.remoteAddress || "unknown";
    const ip = rateLimitIpKey(rawIp);

    const isExpress = typeof next === "function";
    const send429 = () => {
      const retryAfterSec = Math.ceil(windowMs / 1000);
      if (reply.header && typeof reply.header === "function") {
        reply.header("Retry-After", retryAfterSec);
        return reply.code(429).send({ error: "Too many requests. Please slow down." });
      } else if (reply.setHeader && typeof reply.setHeader === "function") {
        reply.setHeader("Retry-After", retryAfterSec);
        return reply.status(429).json({ error: "Too many requests. Please slow down." });
      }
    };

    // Gate 1: Aggregate IP backstop
    const currentIpCount = (ipStore.get(ip) || 0) + 1;
    ipStore.set(ip, currentIpCount);
    if (currentIpCount > max * ipMultiplier) {
      return send429();
    }

    // Gate 2: Per-caller bucket
    const token = tokenFromRequest(req);
    let callerKey = `ip:${ip}`;
    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
      const tokenKey = `user:${tokenHash}`;
      if (isTokenSpray(ip, tokenKey)) {
        callerKey = `spray:${ip}`;
      } else {
        callerKey = `ip:${ip}|${tokenKey}`;
      }
    }

    const currentCallerCount = (callerStore.get(callerKey) || 0) + 1;
    callerStore.set(callerKey, currentCallerCount);

    if (reply.header && typeof reply.header === "function") {
      reply.header("X-RateLimit-Limit", max);
      reply.header("X-RateLimit-Remaining", Math.max(0, max - currentCallerCount));
    } else if (reply.setHeader && typeof reply.setHeader === "function") {
      reply.setHeader("X-RateLimit-Limit", max);
      reply.setHeader("X-RateLimit-Remaining", Math.max(0, max - currentCallerCount));
    }

    if (currentCallerCount > max) {
      return send429();
    }

    if (isExpress) {
      next();
    }
  };

  return limiterHook;
}

export const apiRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
});
