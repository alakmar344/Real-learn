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

// Extra issuers can be allowlisted explicitly (comma-separated), e.g. a
// specific dev instance: CLERK_ADDITIONAL_ISSUERS=https://xyz.clerk.accounts.dev
const ADDITIONAL_ISSUERS = (process.env.CLERK_ADDITIONAL_ISSUERS || "")
  .split(",")
  .map((issuer) => issuer.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Only trust tokens from OUR issuer(s).
//
// SECURITY: previously any hostname ending in ".clerk.accounts.dev" /
// ".accounts.dev" was trusted. Anyone can create a free Clerk dev instance on
// those domains, so an attacker could mint perfectly valid tokens from THEIR
// OWN Clerk app and pass authentication here. Wildcard dev domains are now
// only accepted outside production; production trusts the configured issuer,
// explicit allowlist entries, and this app's own domain.
function isTrustedIssuer(issuer) {
  if (!issuer) return false;
  if (CONFIGURED_FRONTEND_API && issuer === CONFIGURED_FRONTEND_API) return true;
  if (ADDITIONAL_ISSUERS.includes(issuer)) return true;
  try {
    const { hostname, protocol } = new URL(issuer);
    if (protocol !== "https:") return false;
    if (hostname === "reallearn.site" || hostname.endsWith(".reallearn.site")) {
      return true;
    }
    // Shared multi-tenant Clerk dev domains (*.clerk.accounts.dev): anyone can
    // spin up a free instance there and mint valid tokens, so trusting them is
    // an authentication bypass. This must FAIL SAFE — gating on
    // `NODE_ENV !== "production"` trusted them whenever NODE_ENV was simply
    // unset (a common PaaS default), leaving the door open in production. Only
    // trust them when a developer has EXPLICITLY opted in.
    const allowDevIssuers =
      process.env.CLERK_ALLOW_DEV_ISSUERS === "true" ||
      process.env.NODE_ENV === "development";
    if (allowDevIssuers) {
      return (
        hostname.endsWith(".clerk.accounts.dev") ||
        hostname.endsWith(".accounts.dev")
      );
    }
    return false;
  } catch {
    return false;
  }
}

// SECURITY (defense in depth): optionally pin the token's authorized party
// (azp = the frontend origin the token was minted for). Without this, any
// valid token from the same Clerk instance — even one issued to a different
// app sharing the issuer — is accepted. Opt-in via env so existing deploys
// aren't broken: CLERK_AUTHORIZED_PARTIES=https://reallearn.site,https://www.reallearn.site
const AUTHORIZED_PARTIES = (process.env.CLERK_AUTHORIZED_PARTIES || "")
  .split(",")
  .map((party) => party.trim().replace(/\/$/, ""))
  .filter(Boolean);

function isAuthorizedParty(azp) {
  if (AUTHORIZED_PARTIES.length === 0) return true; // not configured → skip
  if (!azp) return false;
  return AUTHORIZED_PARTIES.includes(String(azp).replace(/\/$/, ""));
}

export async function verifyClerkToken(token) {
  try {
    // Always derive the issuer from the token, then check it against the trust
    // list (the configured Frontend API + known Clerk domains). This makes the
    // backend work whether the frontend uses the custom production domain
    // (clerk.reallearn.site) or a *.clerk.accounts.dev dev instance, instead of
    // rejecting everything that doesn't match a single hardcoded issuer.
    const claims = decodeJwt(token);
    const issuer = (claims.iss || "").replace(/\/$/, "");

    if (!isTrustedIssuer(issuer)) {
      return { valid: false, error: `Untrusted token issuer: ${issuer || "none"}` };
    }

    // Use the configured JWKS URL only when it matches the token's issuer;
    // otherwise fetch keys from the issuer's own well-known endpoint.
    const jwksUrl =
      CONFIGURED_JWKS_URL && issuer === CONFIGURED_FRONTEND_API
        ? CONFIGURED_JWKS_URL
        : "";
    const verifyOptions = { issuer };
    const jwks = getJwksForIssuer(issuer, jwksUrl);
    try {
      const { payload } = await jwtVerify(token, jwks, verifyOptions);
      if (!isAuthorizedParty(payload.azp)) {
        return { valid: false, error: `Unauthorized token azp: ${payload.azp}` };
      }
      return { valid: true, payload };
    } catch (remoteError) {
      // If the JWKS endpoint is unreachable, fall back to the configured public
      // key (only valid for the configured issuer). Signature mismatches (a
      // genuinely invalid token) are NOT retried.
      const fallbackKey =
        isJwksFetchError(remoteError) && issuer === CONFIGURED_FRONTEND_API
          ? await getFallbackKey()
          : null;
      if (!fallbackKey) throw remoteError;
      console.warn(
        "[auth] JWKS unreachable, verifying with fallback public key",
        { reason: remoteError.message }
      );
      const { payload } = await jwtVerify(token, fallbackKey, verifyOptions);
      if (!isAuthorizedParty(payload.azp)) {
        return { valid: false, error: `Unauthorized token azp: ${payload.azp}` };
      }
      return { valid: true, payload };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Distinguish "couldn't fetch the keys" (network/host issue) from "the token's
// signature is wrong" (jose throws JWSSignatureVerificationFailed for the latter).
//
// SECURITY: ERR_JWKS_NO_MATCHING_KEY means the LIVE key set was fetched
// successfully and simply does not contain the token's kid (rotated-out or
// forged token). That is a verification failure, NOT a connectivity failure —
// treating it as one would retry the token against the static baked-in
// fallback key and silently expand the trusted-key surface.
function isJwksFetchError(error) {
  const code = error?.code;
  if (code === "ERR_JWKS_NO_MATCHING_KEY") {
    return false;
  }
  if (code === "ERR_JWKS_TIMEOUT") {
    return true;
  }
  const message = (error?.message || "").toLowerCase();
  // Same rule for jose versions that surface the condition by message only.
  if (message.includes("no applicable key")) {
    return false;
  }
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("jwks") ||
    message.includes("json web key set") ||
    message.includes("key set") ||
    message.includes("200 ok") ||
    message.includes("getaddrinfo") ||
    message.includes("econn") ||
    message.includes("enotfound") ||
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

// Safe, non-verifying peek at a token's claims for diagnostics/logging.
export function inspectToken(token) {
  try {
    const claims = decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);
    return {
      iss: claims.iss,
      sub: claims.sub,
      azp: claims.azp,
      exp: claims.exp,
      expired: typeof claims.exp === "number" ? claims.exp < now : null,
      trustedIssuer: isTrustedIssuer((claims.iss || "").replace(/\/$/, "")),
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required. No token provided." });
  }

  const result = await verifyClerkToken(token);
  if (!result.valid) {
    console.warn("[auth] Token verification failed", {
      reason: result.error,
      token: inspectToken(token),
      configuredIssuer: CONFIGURED_FRONTEND_API,
    });
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  req.auth = {
    userId: result.payload.sub,
    sessionId: result.payload.sid,
    ...result.payload,
  };

  next();
}
