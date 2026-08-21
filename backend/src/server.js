// Composition root: Fastify initialization, Undici keep-alive connection pool,
// plugin mounting (order is behavior), router mounting, terminal handlers,
// listen + graceful shutdown.
import "./lib/polyfills.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyCompress from "@fastify/compress";
import { preconnectProviders } from "./lib/aiEngine.js";
import { closeMongo } from "./lib/mongodb.js";
import { PORT, validateStartupConfig } from "./config.js";
import {
  corsOptions,
  compressOptions,
  securityPlugin,
} from "./middleware/security.js";
import healthRoutes from "./routes/health.js";
import readyRoutes from "./routes/ready.js";
import accountRoutes from "./routes/account.js";
import feedbackRoutes from "./routes/feedback.js";
import ttsRoutes from "./routes/tts.js";
import lessonRoutes from "./routes/lesson.js";
import lessonCacheCheckRoutes from "./routes/lessonCacheCheck.js";
import {
  scrubStoredConsentIps,
  scrubStoredConsentEmails,
  ensureUserDataIndexes,
} from "./startup/migrations.js";

// LATENCY & THROUGHPUT OPTIMIZATION:
// Configure global Undici dispatcher with persistent connection pooling and keep-alive.
// Eliminates 50–150ms DNS+TCP+TLS handshakes across Groq, Mistral, NVIDIA, Cloudflare,
// Serper, and Clerk JWKS endpoints.
try {
  const { Agent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(
    new Agent({
      keepAliveTimeout: 60_000,
      keepAliveMaxTimeout: 600_000,
      connections: 100,
      pipelining: 1,
    })
  );
} catch {
  // Bun runtime and edge environments have native socket pooling
}

export function buildServer() {
  const fastify = Fastify({
    logger: false,
    trustProxy: 1,
    bodyLimit: 100 * 1024, // 100kb limit
  });

  // Register Core Plugins
  fastify.register(fastifyCors, corsOptions);
  fastify.register(fastifyCompress, compressOptions);
  fastify.register(securityPlugin);

  // Register API Route Plugins
  fastify.register(healthRoutes);
  fastify.register(readyRoutes);
  fastify.register(accountRoutes);
  fastify.register(feedbackRoutes);
  fastify.register(ttsRoutes);
  fastify.register(lessonRoutes);
  fastify.register(lessonCacheCheckRoutes);

  // JSON 404 for unmatched routes
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: "Not found" });
  });

  // Terminal error handler
  fastify.setErrorHandler((err, request, reply) => {
    if (reply.raw.headersSent) {
      return;
    }
    const isBodyParseError =
      err.statusCode === 400 &&
      (err.code === "FST_ERR_CTP_INVALID_JSON" || err instanceof SyntaxError);
    const isBodyTooLarge =
      err.statusCode === 413 || err.code === "FST_ERR_CTP_BODY_TOO_LARGE";
    const isCorsDenied = err.message === "CORS origin denied";
    const status = isBodyParseError
      ? 400
      : isBodyTooLarge
        ? 413
        : isCorsDenied
          ? 403
          : err.statusCode || 500;
    const message = isBodyParseError
      ? "Invalid JSON in request body"
      : isBodyTooLarge
        ? "Request body too large"
        : isCorsDenied
          ? "Origin not allowed"
          : status < 500 && err.message
            ? err.message
            : "Internal server error";

    console.error("[error-handler]", {
      path: request.url,
      status,
      errorName: err.name,
      errorMessage: err.message,
    });
    reply.code(status).send({ error: message });
  });

  return fastify;
}

export async function startServer() {
  try {
    validateStartupConfig();
    const fastify = buildServer();

    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Fastify backend listening on port ${PORT}`);

    // Slowloris & Keep-Alive timeouts on the underlying HTTP server
    fastify.server.headersTimeout = 15_000;
    fastify.server.requestTimeout = 30_000;
    fastify.server.keepAliveTimeout = 10_000;

    // Background startup warm-ups and migrations. These are best-effort:
    // contained in their own try/catch so a synchronous throw here can never
    // reach the fatal startup catch below and process.exit(1) an already
    // listening, healthy server.
    try {
      preconnectProviders();
      void scrubStoredConsentIps();
      void scrubStoredConsentEmails();
      void ensureUserDataIndexes();
    } catch (warmupError) {
      console.warn("[startup] Non-fatal warm-up error:", warmupError);
    }

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`[shutdown] ${signal} received, starting graceful shutdown`);
      try {
        await fastify.close();
        console.log("[shutdown] Fastify server closed");
      } catch (err) {
        console.error("[shutdown] Error closing fastify server:", err);
      } finally {
        await closeMongo();
        process.exit(0);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      console.error("[process] Unhandled promise rejection", reason);
    });
    process.on("uncaughtException", (error) => {
      console.error("[process] Uncaught exception — exiting", error);
      closeMongo().finally(() => process.exit(1));
    });

    return fastify;
  } catch (error) {
    console.error("[startup] Backend configuration error:", error);
    process.exit(1);
  }
}

// Auto-start when executed as the main entrypoint
const isMainModule = () => {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const executedFile = path.resolve(process.argv[1]);
    return currentFile === executedFile;
  } catch {
    return false;
  }
};

if (isMainModule()) {
  startServer();
}
