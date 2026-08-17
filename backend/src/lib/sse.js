// SSE plumbing shared by the lesson stream's three writer paths (cache hit,
// single-flight follower, generation leader). The leader's lifecycle machinery
// (heartbeat, finishRequest, progress tickers) stays in the route handler —
// it closes over per-request state (concurrency slots, the single-flight
// settle, the generation abort controller) that has no meaning outside it.

/**
 * Set the SSE response headers and flush them immediately. May throw when the
 * client is already gone — callers wrap this in their own try/catch so the
 * failure routes into their cleanup path.
 */
export function flushSseHeaders(res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
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

  const sendEvent = (event, payload) => {
    const eventWritten = safeWrite(`event: ${event}\n`);
    const dataWritten = safeWrite(`data: ${JSON.stringify(payload)}\n\n`);
    if (!eventWritten || !dataWritten) {
      console.warn("[SSE] Event write failed", { requestId, event });
    }
    return eventWritten && dataWritten;
  };

  return { safeWrite, sendEvent };
}
