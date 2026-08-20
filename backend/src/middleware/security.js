// App-level middleware: CORS, origin guard, compression, security headers, and
// the Timing-Allow-Origin scoping. server.js mounts these in a fixed order —
// see the mounting site; the order is behavior.
import compression from "compression";
import cors from "cors";
import zlib from "node:zlib";

const configuredOrigins =
  process.env.FRONTEND_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
const allowedOrigins =
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
// non-browser/server-to-server traffic and are handled by CORS separately.
function isOriginAllowed(origin) {
  return !!origin && allowedOrigins.includes(origin);
}

// Log injection guard: rejected user-controlled strings (Origin header,
// language/level fields) get logged for diagnostics — strip control chars
// and cap length so they can't forge lines in a plaintext log sink.
export function cleanForLog(value, maxChars = 200) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxChars);
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // No Origin header = non-browser client (uptime monitor, curl,
    // server-to-server). CORS is a browser mechanism; auth still applies,
    // so let those through without CORS headers instead of 403ing them.
    if (!origin || isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.warn("[CORS] origin denied", { origin: cleanForLog(origin) });
    return callback(new Error("CORS origin denied"));
  },
  methods: ["POST", "OPTIONS", "GET", "DELETE"],
  // If-None-Match lets cross-origin TTS fetches revalidate via ETag (the
  // handler serves 304s on it — without this the preflight rejects it).
  allowedHeaders: ["Content-Type", "Authorization", "If-None-Match"],
  // PERFORMANCE: Cache preflight OPTIONS responses for 24h (86400s) so repeat
  // API requests and cache checks avoid unnecessary preflight roundtrips.
  maxAge: 86400,
});

export function originGuard(req, res, next) {
  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin)) {
    console.warn("[origin] denied", { origin: cleanForLog(origin), path: req.path });
    return res.status(403).json({ error: "Origin not allowed." });
  }
  next();
}

// BANDWIDTH: compress every compressible response. compression@1.8 natively
// negotiates Brotli first (falling back to gzip/deflate), which shrinks
// lesson JSON ~80% — critical for staying under the monthly transfer cap.
// The old `zlib: { brotli: {} }` key was a silent no-op; the real options
// are top-level. SSE streams are exempt — compression buffers them, which
// would delay heartbeats and events; audio/mpeg is skipped automatically as
// already compressed.
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.path === "/api/generate-lesson") return false;
    return compression.filter(req, res);
  },
  // Compress even small JSON bodies (error payloads, health checks) —
  // every byte counts against the bandwidth budget.
  threshold: 128,
  // gzip effort 6 = best ratio/CPU trade-off for dynamic responses.
  level: 6,
  // Brotli quality 5 beats gzip-9 ratios at a fraction of the CPU of the
  // library default (11), which is far too slow for on-the-fly responses.
  brotli: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
    },
  },
});

export function securityHeaders(req, res, next) {
  // Pure JSON/SSE API — nothing here should ever render in a frame.
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  // Cross-Origin-Resource-Policy is intentionally NOT set. The backend API is
  // consumed cross-origin by the frontend (reallearn.site -> real-learn.onrender.com).
  // A `same-origin` CORP header would block those responses even though CORS is
  // configured correctly.
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  // Security: apply hardening headers unless explicitly in local development.
  // Gating on NODE_ENV === "production" silently dropped HSTS/CSP whenever the
  // host forgot to set NODE_ENV — fail safe instead.
  if (process.env.NODE_ENV !== "development") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
  }
  next();
}

// PERFORMANCE: expose Server-Timing so devtools can break down where time
// is spent (DB, AI, Serper). SECURITY: scoped to the CORS allowlist instead
// of "*" — a wildcard would let ANY cross-origin page read fine-grained
// resource-timing for our API responses (a timing side-channel), while only
// our own frontend actually needs it.
export function timingAllowOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.setHeader("Timing-Allow-Origin", origin);
  }
  next();
}
