// Composition root: config load, middleware mounting (order is behavior),
// router mounting, terminal handlers, listen + graceful shutdown. All route
// logic lives under src/routes/, shared plumbing under src/lib/ and
// src/middleware/, startup maintenance under src/startup/.
import express from "express";
import { preconnectProviders } from "./lib/aiEngine.js";
import { closeMongo } from "./lib/mongodb.js";
import { PORT, validateStartupConfig } from "./config.js";
import {
  corsMiddleware,
  originGuard,
  compressionMiddleware,
  securityHeaders,
  timingAllowOrigin,
} from "./middleware/security.js";
import healthRouter from "./routes/health.js";
import accountRouter from "./routes/account.js";
import feedbackRouter from "./routes/feedback.js";
import ttsRouter from "./routes/tts.js";
import lessonRouter from "./routes/lesson.js";
import {
  scrubStoredConsentIps,
  scrubStoredConsentEmails,
  ensureUserDataIndexes,
} from "./startup/migrations.js";

const app = express();
// Behind Render/most PaaS proxies req.ip would otherwise be the proxy's own
// address, collapsing every anonymous visitor into one rate-limit bucket and
// recording the wrong IP in consent records.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// CORS and JSON body parsing MUST be registered before any route so that every
// endpoint (including /api/agreement) receives CORS headers and a parsed body.
app.use(corsMiddleware);
// Every legitimate request body here is tiny (a question + a few enum
// fields). 100kb still leaves huge headroom while blunting memory abuse.
app.use(express.json({ limit: "100kb" }));
app.use(originGuard);
app.use(compressionMiddleware);
app.use(securityHeaders);
app.use(timingAllowOrigin);

// Routers are mounted at the root, so every route keeps its original exact
// path (/health, /api/...). All paths are distinct literals, so mount order
// carries no matching significance — but keep the terminal 404/error handlers
// LAST regardless.
app.use(healthRouter);
app.use(accountRouter);
app.use(feedbackRouter);
app.use(ttsRouter);
app.use(lessonRouter);

// JSON 404 for unmatched routes — without this, Express's finalhandler
// returns an HTML "Cannot GET /x" body, a content-type mismatch for a JSON
// API and a needless stack-fingerprint signal.
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Terminal error handler — MUST be registered after every route. Without it,
// Express's default finalhandler echoes err.stack to the client whenever
// NODE_ENV isn't "production" (easy to forget on a PaaS), leaking internal
// paths. Malformed JSON bodies and over-limit payloads land here too.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) {
    // Response already streaming (e.g. SSE) — nothing safe to send.
    return res.end();
  }
  const isBodyParseError =
    err?.type === "entity.parse.failed" || err instanceof SyntaxError;
  const isBodyTooLarge = err?.type === "entity.too.large";
  const isCorsDenied = err?.message === "CORS origin denied";
  const status = isBodyParseError ? 400 : isBodyTooLarge ? 413 : isCorsDenied ? 403 : 500;
  const message = isBodyParseError
    ? "Invalid JSON in request body"
    : isBodyTooLarge
      ? "Request body too large"
      : isCorsDenied
        ? "Origin not allowed"
        : "Internal server error";
  console.error("[error-handler]", {
    path: req.path,
    status,
    errorName: err?.name,
    errorMessage: err?.message,
  });
  res.status(status).json({ error: message });
});

try {
  validateStartupConfig();
  const server = app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
    // LATENCY: open DNS+TCP+TLS to every configured AI provider once at boot
    // so the first user request skips the handshake. (The old periodic
    // Cloudflare inference warm-up is gone — Groq/Mistral have no model cold
    // start, and pinging a last-resort provider 24/7 burned ~700 calls/day.)
    preconnectProviders();
    // Privacy (policy v2.3): retroactively anonymize raw IPs stored by
    // earlier releases. Fire-and-forget; errors are logged, not fatal.
    void scrubStoredConsentIps();
    // Privacy (policy v3.2): retroactively remove stored emails from consent
    // records — the email lives only with Clerk. Fire-and-forget.
    void scrubStoredConsentEmails();
    // DoS hardening: index the per-user query paths. Fire-and-forget.
    void ensureUserDataIndexes();
  });

  // SECURITY (Slowloris): bound how long a client may take to send its
  // headers and its whole request. These apply to request RECEPTION only, so
  // long-lived SSE responses (lesson streams) are unaffected. Node's
  // defaults (60s/300s) leave sockets hostage far longer than any legitimate
  // client needs to upload a <100kb JSON body.
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  // Keep idle keep-alive sockets on a short leash as well.
  server.keepAliveTimeout = 10_000;

  // Graceful shutdown: stop accepting new connections, wait for in-flight
  // requests to finish (up to 30s), then close MongoDB and exit.
  const shutdown = (signal) => {
    console.log(`[shutdown] ${signal} received, starting graceful shutdown`);
    server.close(() => {
      console.log("[shutdown] All connections closed");
      // Drain the Mongo pool before exit so in-flight writes are not
      // severed mid-operation on every deploy/restart.
      closeMongo().finally(() => process.exit(0));
    });
    // Force-kill after 30 seconds if connections won't drain.
    setTimeout(() => {
      console.error("[shutdown] Forced exit after 30s timeout");
      process.exit(1);
    }, 30000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Last-resort safety nets. A stray rejection kills the whole process on
  // Node >= 15; log it instead of dying. A truly uncaught exception means
  // unknown state — log, then exit so the platform restarts a clean process.
  process.on("unhandledRejection", (reason) => {
    console.error("[process] Unhandled promise rejection", reason);
  });
  process.on("uncaughtException", (error) => {
    console.error("[process] Uncaught exception — exiting", error);
    closeMongo().finally(() => process.exit(1));
  });
} catch (error) {
  console.error("[startup] Backend configuration error:", error);
  process.exit(1);
}
