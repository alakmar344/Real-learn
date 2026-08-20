import { isOriginAllowed } from "../middleware/security.js";

// SSE plumbing shared by the lesson stream's three writer paths (cache hit,
// single-flight follower, generation leader). The leader's lifecycle machinery
// (heartbeat, finishRequest, progress tickers) stays in the route handler —
// it closes over per-request state (concurrency slots, the single-flight
// settle, the generation abort controller) that has no meaning outside it.

/**
 * Set the SSE response headers and flush them immediately. May throw when the
 * client is already gone — callers wrap this in their own try/catch so the
 * failure routes into their cleanup path.
 *
 * Fastify stream hijacking (reply.hijack()) bypasses the Fastify onSend plugin
 * pipeline, so CORS, Vary, and security headers must be set explicitly on the
 * raw Node ServerResponse before flushing.
 */
export function flushSseHeaders(res, req) {
  const origin = req?.headers?.origin || res?.req?.headers?.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, If-None-Match, Accept, Cache-Control, X-Requested-With, x-clerk-auth-token"
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Retry-After, ETag, X-RateLimit-Limit, X-RateLimit-Remaining, Content-Disposition, Content-Length"
    );
    res.setHeader("Vary", "Origin");
    res.setHeader("Timing-Allow-Origin", origin);
  }
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.flushHeaders();
}

/**
 * Per-request SSE writer pair: `safeWrite` never throws (a dead socket logs
 * and returns false), `sendEvent` frames an event + JSON payload on top of it.
 */
export function createSseWriter(res, requestId) {
  const safeWrite = (chunk) => {
    try {
      if (res.writableEnded) return false;
      return res.write(chunk);
    } catch (error) {
      console.error("[SSE] write failed", { requestId, error });
      return false;
    }
  };

  // One write per event frame: a single res.write cannot be torn in half by a
  // dead socket (the old two-write version could emit `event:` without its
  // `data:` line), and small frames coalesce into one TCP packet.
  const sendEvent = (event, payload) => {
    const written = safeWrite(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    if (!written) {
      console.warn("[SSE] Event write failed", { requestId, event });
    }
    return written;
  };

  // Write several events in a single TCP packet. Useful for the cache-hit and
  // follower paths where multiple frames are emitted back-to-back.
  const sendBatch = (events) => {
    const frame = events
      .map(({ event, payload }) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n`)
      .join("\n");
    const written = safeWrite(`${frame}\n`);
    if (!written) {
      console.warn("[SSE] Batch write failed", { requestId, eventCount: events.length });
    }
    return written;
  };

  return { safeWrite, sendEvent, sendBatch };
}
