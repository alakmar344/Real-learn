// App-level security: CORS configuration, origin guard, security headers,
// and Timing-Allow-Origin scoping for Fastify.
import zlib from "node:zlib";

const configuredOrigins =
  process.env.FRONTEND_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

export const allowedOrigins =
  configuredOrigins.length > 0
    ? configuredOrigins
    : [
        "https://reallearn.site",
        "https://www.reallearn.site",
        "https://reallearn-taupe.vercel.app",
        "https://real-learn.onrender.com",
        ...(process.env.NODE_ENV !== "production"
          ? ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]
          : []),
      ];

// Allowed Origin means the exact browser Origin header is either listed in
// FRONTEND_ORIGIN (comma-separated) or, by default, the production frontend
// and Render preview origins above. Requests without an Origin header are
// non-browser/server-to-server traffic.
export function isOriginAllowed(origin) {
  return !!origin && allowedOrigins.includes(origin);
}

// Log injection guard: rejected user-controlled strings (Origin header,
// language/level fields) get logged for diagnostics — strip control chars
// and cap length so they can't forge lines in a plaintext log sink.
export function cleanForLog(value, maxChars = 200) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxChars);
}

// Fastify CORS options
export const corsOptions = {
  origin: (origin, callback) => {
    // No Origin header = non-browser client (uptime monitor, curl, server-to-server).
    if (!origin || isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.warn("[CORS] origin denied", { origin: cleanForLog(origin) });
    return callback(new Error("CORS origin denied"), false);
  },
  methods: ["POST", "OPTIONS", "GET", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "If-None-Match"],
  maxAge: 86400,
};

// Fastify Compress options
export const compressOptions = {
  customFilter: (contentType, req) => {
    // SSE streams must NOT be compressed (buffering would delay heartbeats and tokens)
    const url = req?.raw?.url || req?.url || "";
    if (url.startsWith("/api/generate-lesson")) return false;
    return true;
  },
  threshold: 128,
  zlibOptions: {
    level: 6,
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
    },
  },
};

// Fastify Security Plugin: registers security headers, Timing-Allow-Origin,
// and Origin guard across all routes.
export async function securityPlugin(fastify) {
  // Origin Guard: reject forbidden cross-origin browser requests
  fastify.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      console.warn("[origin] denied", { origin: cleanForLog(origin), path: req.url });
      return reply.code(403).send({ error: "Origin not allowed." });
    }
  });

  // Security Headers Hook
  fastify.addHook("onSend", async (req, reply) => {
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("X-XSS-Protection", "0");
    reply.header("Cross-Origin-Opener-Policy", "same-origin");
    reply.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    );

    if (process.env.NODE_ENV !== "development") {
      reply.header(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload"
      );
      reply.header(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      );
    }

    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
      reply.header("Timing-Allow-Origin", origin);
    }
  });
}
