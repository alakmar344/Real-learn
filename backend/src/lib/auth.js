import { createRemoteJWKSet, jwtVerify, decodeJwt } from "jose";

// Optional explicit override. When set, ONLY this issuer is trusted.
const CONFIGURED_FRONTEND_API = (
  process.env.CLERK_FRONTEND_API || ""
).trim().replace(/\/$/, "");
const CONFIGURED_JWKS_URL = (process.env.CLERK_JWKS_URL || "").trim();

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
      hostname.endsWith(".accounts.dev")
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

    const jwks = getJwksForIssuer(issuer, CONFIGURED_JWKS_URL);
    const { payload } = await jwtVerify(token, jwks, { issuer });
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error.message };
  }
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
