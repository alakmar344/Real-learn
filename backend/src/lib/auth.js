import { createRemoteJWKSet, importSPKI, jwtVerify } from "jose";

// --- Production Clerk configuration -----------------------------------------
// These defaults target the production Clerk instance for reallearn.site.
// Every value can be overridden via environment variables so the same code
// runs unchanged across environments.
const CLERK_FRONTEND_API =
  process.env.CLERK_FRONTEND_API || "https://clerk.reallearn.site";
const CLERK_JWKS_URL =
  process.env.CLERK_JWKS_URL || `${CLERK_FRONTEND_API}/.well-known/jwks.json`;
// Clerk session tokens are issued by the Frontend API origin, so the `iss`
// claim must match it exactly.
const CLERK_ISSUER = process.env.CLERK_ISSUER || CLERK_FRONTEND_API;

// Optional networkless verification key (PEM / SPKI). When present we verify
// signatures locally without a round-trip to the JWKS endpoint. JWKS remains
// the fallback so automatic key rotation keeps working.
const CLERK_JWT_PUBLIC_KEY = (process.env.CLERK_JWT_PUBLIC_KEY || "").trim();

// Remote JWKS set (cached + auto-refreshed by jose). Primary verifier and the
// fallback whenever a local key is configured.
const JWKS = createRemoteJWKSet(new URL(CLERK_JWKS_URL));

function normalizePem(raw) {
  // Env vars frequently store PEM blocks as a single line with escaped
  // newlines ("\n"). Restore real newlines and add the SPKI header/footer if a
  // bare base64 body was provided.
  let pem = raw.replace(/\\n/g, "\n").trim();
  if (!pem.includes("BEGIN")) {
    const body = pem.replace(/\s+/g, "");
    pem = `-----BEGIN PUBLIC KEY-----\n${body.match(/.{1,64}/g)?.join("\n") ?? body}\n-----END PUBLIC KEY-----`;
  }
  return pem;
}

// Import the local public key once and reuse the promise.
let localPublicKeyPromise = null;
function getLocalPublicKey() {
  if (!CLERK_JWT_PUBLIC_KEY) return null;
  if (!localPublicKeyPromise) {
    localPublicKeyPromise = importSPKI(normalizePem(CLERK_JWT_PUBLIC_KEY), "RS256");
  }
  return localPublicKeyPromise;
}

export async function verifyClerkToken(token) {
  const options = { issuer: CLERK_ISSUER };
  try {
    // Fast path: verify with the locally-configured public key when available.
    const localKey = await getLocalPublicKey();
    if (localKey) {
      try {
        const { payload } = await jwtVerify(token, localKey, options);
        return { valid: true, payload };
      } catch {
        // Fall through to JWKS — handles key rotation / kid changes gracefully.
      }
    }

    const { payload } = await jwtVerify(token, JWKS, options);
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
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  req.auth = {
    userId: result.payload.sub,
    sessionId: result.payload.sid,
    ...result.payload,
  };

  next();
}
