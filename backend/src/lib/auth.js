import { createRemoteJWKSet, jwtVerify, decodeJwt, importSPKI } from "jose";

// Clerk Frontend API URL — this is the token issuer. Override via env, defaults
// to this app's production Clerk domain. When set, ONLY this issuer is trusted.
const CONFIGURED_FRONTEND_API = (
  process.env.CLERK_FRONTEND_API || "https://clerk.reallearn.site"
).trim().replace(/\/$/, "");
const CONFIGURED_JWKS_URL = (process.env.CLERK_JWKS_URL || "").trim();

// Offline verification fallback. The remote JWKS above is primary (it handles
// Clerk key rotation automatically); this PEM public key is only used if the
// JWKS endpoint can't be reached from the backend host. Override via env.
const DEFAULT_JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsy95RHH/IzoHutLq7vl2
8uo2xU2IjCw8nA9QhFTk4+1aEAJHiSaUa8iLOh71BX1L2Y+CpQbv6en6yWlYw++l
9jE6q5sp07b3zF81SpzxayqqXDh35+hBsF79koEW8a+lT7Vs0LMGLvb3rMuHHVVP
5HBJ7KG2X+9eFtMDmFjlKc8wKXZif20M3m1Y1MxCDgIbvB2c7PKVS5BV+2+prb9W
NOFYy92ut7nyJLbEYXyEXk7ijmN9u5KP9vKo0zCPyj5/UM6AsIbWUkMONRgb3T1s
eVCKk4fs3w/daUu/MCnHE2ftmojAEMyVHZOFlRkmzZ3CHrZESbg8xOmKE2g1ugo9
2wIDAQAB
-----END PUBLIC KEY-----`;
const CONFIGURED_JWT_PUBLIC_KEY = (
  process.env.CLERK_JWT_PUBLIC_KEY || DEFAULT_JWT_PUBLIC_KEY
).trim();

let fallbackKeyPromise = null;
function getFallbackKey() {
  if (!CONFIGURED_JWT_PUBLIC_KEY) return null;
  if (!fallbackKeyPromise) {
    fallbackKeyPromise = importSPKI(CONFIGURED_JWT_PUBLIC_KEY, "RS256").catch(
      (error) => {
        console.error("[auth] Failed to import fallback public key", error);
        return null;
      }
    );
  }
  return fallbackKeyPromise;
}

// Cache one JWKS set per issuer so we don't re-fetch keys on every request.
const jwksCache = new Map();

function getJwksForIssuer(issuer, explicitJwksUrl) {
  const jwksUrl = explicitJwksUrl || `${issuer}/.well-known/jwks.json`;
  let jwks = jwksCache.get(jwksUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    jwksCache.set(jwksUrl, jwks);
  }
  return jwks;
}

// Only trust Clerk-issued tokens. Accepts standard Clerk domains plus any
// explicitly configured issuer.
function isTrustedIssuer(issuer) {
  if (!issuer) return false;
  if (CONFIGURED_FRONTEND_API && issuer === CONFIGURED_FRONTEND_API) return true;
  try {
    const { hostname, protocol } = new URL(issuer);
    if (protocol !== "https:") return false;
    return (
      hostname.endsWith(".clerk.accounts.dev") ||
      hostname.endsWith(".clerk.com") ||
      hostname.endsWith(".accounts.dev") ||
      hostname.endsWith(".reallearn.site")
    );
  } catch {
    return false;
  }
}

export async function verifyClerkToken(token) {
  try {
    // If an explicit issuer is configured, pin verification to it.
    // Otherwise derive the issuer from the token itself so the backend works
    // with whatever Clerk instance the frontend is configured to use.
    let issuer = CONFIGURED_FRONTEND_API;
    if (!issuer) {
      const claims = decodeJwt(token);
      issuer = (claims.iss || "").replace(/\/$/, "");
    }

    if (!isTrustedIssuer(issuer)) {
      return { valid: false, error: `Untrusted token issuer: ${issuer || "none"}` };
    }

    const verifyOptions = { issuer };
    const jwks = getJwksForIssuer(issuer, CONFIGURED_JWKS_URL);
    try {
      const { payload } = await jwtVerify(token, jwks, verifyOptions);
      return { valid: true, payload };
    } catch (remoteError) {
      // If the JWKS endpoint is unreachable, fall back to the configured public
      // key. Signature mismatches (a genuinely invalid token) are NOT retried.
      const fallbackKey = isJwksFetchError(remoteError)
        ? await getFallbackKey()
        : null;
      if (!fallbackKey) throw remoteError;
      console.warn(
        "[auth] JWKS unreachable, verifying with fallback public key",
        { reason: remoteError.message }
      );
      const { payload } = await jwtVerify(token, fallbackKey, verifyOptions);
      return { valid: true, payload };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Distinguish "couldn't fetch the keys" (network/host issue) from "the token's
// signature is wrong" (jose throws JWSSignatureVerificationFailed for the latter).
function isJwksFetchError(error) {
  const code = error?.code;
  if (code === "ERR_JWKS_NO_MATCHING_KEY" || code === "ERR_JWKS_TIMEOUT") {
    return true;
  }
  const message = (error?.message || "").toLowerCase();
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("jwks") ||
    message.includes("getaddrinfo") ||
    message.includes("timeout")
  );
}

export function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required. No token provided." });
  }

  const result = await verifyClerkToken(token);
  if (!result.valid) {
    console.warn("[auth] Token verification failed", { reason: result.error });
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  req.auth = {
    userId: result.payload.sub,
    sessionId: result.payload.sid,
    ...result.payload,
  };

  next();
}
