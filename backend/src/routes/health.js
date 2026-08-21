import { getDb } from "../lib/mongodb.js";
import { getProviderHealthSnapshot, allCircuitsOpen } from "../lib/aiEngine.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import { SERVICE_VERSION } from "../config.js";

// SECURITY: /health is unauthenticated and pings MongoDB on every hit —
// without its own limiter it is a free amplification vector onto the
// database. 120/min per IP is far above any legitimate load-balancer or
// uptime-monitor cadence while capping a flood.
const healthRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
});

// The MongoDB ping is the only expensive/amplifiable part of this handler.
// Cache its result briefly so a burst of health checks (many IPs, past the
// per-IP limiter) collapses onto ONE ping per window instead of one per hit.
const DB_PING_CACHE_MS = 3_000;
let dbPingCache = { at: 0, result: null };

async function checkMongo() {
  const now = Date.now();
  if (dbPingCache.result && now - dbPingCache.at < DB_PING_CACHE_MS) {
    return dbPingCache.result;
  }
  const dbStart = process.hrtime.bigint();
  let result;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    result = {
      status: "ok",
      latencyMs: Number((process.hrtime.bigint() - dbStart) / 1_000_000n),
    };
  } catch {
    result = {
      status: "down",
      latencyMs: Number((process.hrtime.bigint() - dbStart) / 1_000_000n),
    };
  }
  dbPingCache = { at: now, result };
  return result;
}

// PUBLIC health check. This route is deliberately unauthenticated — uptime
// monitors, load balancers, and container orchestrators must reach it without a
// Clerk token. It NEVER discloses secrets: only coarse dependency states,
// measured latencies, uptime, and the service version.
export async function healthHandler(_req, res) {
  const startedAt = process.hrtime.bigint();

  const dependencies = {};
  let ok = true;

  dependencies.mongodb = await checkMongo();
  if (dependencies.mongodb.status !== "ok") ok = false;

  const aiSnapshot = getProviderHealthSnapshot();
  const aiOutage = allCircuitsOpen();
  const aiDegraded =
    aiOutage ||
    Object.values(aiSnapshot).some(
      (provider) => provider.circuitOpen || provider.consecutiveFailures > 0
    );
  dependencies.ai = { status: aiOutage ? "down" : aiDegraded ? "degraded" : "ok" };

  const status = ok && !aiOutage ? 200 : 503;
  const payload = {
    ok: ok && !aiOutage,
    status: !ok ? "unhealthy" : aiOutage ? "degraded" : "healthy",
    version: SERVICE_VERSION,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    latencyMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n),
    dependencies,
  };

  if (res.header && typeof res.header === "function") {
    res.header("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
    return res.code(status).send(payload);
  }
  if (res.setHeader && typeof res.setHeader === "function") {
    res.setHeader("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
  }
  if (res.status && typeof res.status === "function") {
    return res.status(status).json(payload);
  }
}

export default async function healthRoutes(fastify) {
  fastify.get("/health", { preHandler: [healthRateLimiter] }, healthHandler);
  fastify.get("/api/health", { preHandler: [healthRateLimiter] }, healthHandler);
}
