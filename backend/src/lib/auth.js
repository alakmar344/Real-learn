import { createRemoteJWKSet, jwtVerify } from "jose";

const CLERK_FRONTEND_API = process.env.CLERK_FRONTEND_API || "https://stable-arachnid-28.clerk.accounts.dev";
const CLERK_JWKS_URL = process.env.CLERK_JWKS_URL || `${CLERK_FRONTEND_API}/.well-known/jwks.json`;

const JWKS = createRemoteJWKSet(new URL(CLERK_JWKS_URL));

const CLERK_ISSUER = CLERK_FRONTEND_API;

export async function verifyClerkToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: CLERK_ISSUER,
    });
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
