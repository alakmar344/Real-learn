// Consent, account-deletion, and data-export routes for Fastify.
// Identity is ALWAYS the verified clerkId from the token.
import { getDb } from "../lib/mongodb.js";
import { requireAuth, getAuthEmail } from "../lib/auth.js";
import { anonymizeIp, hashUserAgent } from "../lib/privacy.js";
import { apiRateLimiter } from "../lib/rateLimit.js";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
  COOKIE_POLICY_VERSION,
} from "../config.js";

function getClientIp(req) {
  return req.ip || req.raw?.socket?.remoteAddress || req.socket?.remoteAddress || "";
}

function getUserAgent(req) {
  return req.headers?.["user-agent"] || "";
}

export async function agreementHandler(req, res) {
  const send = (status, payload) => {
    if (res.code && typeof res.code === "function") return res.code(status).send(payload);
    if (res.status && typeof res.status === "function") return res.status(status).json(payload);
    if (res.json && typeof res.json === "function") return res.json(payload);
  };

  try {
    const { accepted, timestamp } = req.body ?? {};

    if (typeof accepted !== "boolean") {
      return send(400, { error: "accepted (boolean) is required" });
    }

    const parsedTimestamp = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(parsedTimestamp.getTime())) {
      return send(400, { error: "A valid timestamp is required" });
    }

    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return send(400, { error: "Could not determine the authenticated user" });
    }

    const db = await getDb();
    const collection = db.collection("agreements");

    const filter = { clerkId, type: "cookie-consent" };
    const update = {
      $set: {
        accepted,
        clerkId,
        deviceIp: anonymizeIp(getClientIp(req)),
        userAgent: hashUserAgent(getUserAgent(req)),
        timestamp: parsedTimestamp,
        privacyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        cookieVersion: COOKIE_POLICY_VERSION,
        updatedAt: new Date(),
      },
      $unset: { email: "", emailVerified: "", emailSource: "" },
      $setOnInsert: {
        type: "cookie-consent",
        createdAt: new Date(),
      },
    };

    await collection.updateOne(filter, update, { upsert: true });
    console.log("[api/agreement] Consent saved", { clerkId, accepted });

    return send(200, { ok: true });
  } catch (error) {
    console.error("[api/agreement] Failed to save consent", error);
    return send(500, { error: "Failed to save consent" });
  }
}

export async function agreementStatusHandler(req, res) {
  const send = (status, payload, cacheHeader) => {
    if (res.header && typeof res.header === "function") res.header("Cache-Control", cacheHeader);
    else if (res.setHeader && typeof res.setHeader === "function") res.setHeader("Cache-Control", cacheHeader);

    if (res.code && typeof res.code === "function") return res.code(status).send(payload);
    if (res.status && typeof res.status === "function") return res.status(status).json(payload);
    if (res.json && typeof res.json === "function") return res.json(payload);
  };

  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return send(400, { error: "Could not determine the authenticated user" }, "private, no-store");
    }

    const db = await getDb();
    const agreement = await db
      .collection("agreements")
      .findOne({ clerkId, type: "cookie-consent" });

    if (agreement) {
      return send(
        200,
        {
          accepted: agreement.accepted,
          cookieVersion: agreement.cookieVersion || null,
        },
        "private, max-age=300"
      );
    } else {
      return send(200, { accepted: false }, "private, max-age=60");
    }
  } catch (error) {
    console.error("[api/agreement/status] Failed to fetch status", error);
    return send(500, { error: "Failed to fetch consent status" }, "private, no-store");
  }
}

export async function accountDeleteHandler(req, res) {
  const send = (status, payload) => {
    if (res.code && typeof res.code === "function") return res.code(status).send(payload);
    if (res.status && typeof res.status === "function") return res.status(status).json(payload);
    if (res.json && typeof res.json === "function") return res.json(payload);
  };

  const userId = req.auth?.userId;
  const email = getAuthEmail(req.auth);
  console.log("[api/account] Delete request", { userId, hasEmail: Boolean(email) });

  if (!userId) {
    return send(400, { error: "Could not determine the user to delete." });
  }

  if (res.header && typeof res.header === "function") {
    res.header("Vary", "Accept-Encoding");
  } else if (res.setHeader && typeof res.setHeader === "function") {
    res.setHeader("Vary", "Accept-Encoding");
  }

  let agreementsDeleted = 0;
  let moderationLogsDeleted = 0;
  try {
    const db = await getDb();
    const filter = { clerkId: userId };
    const [agreementsResult, modResult] = await Promise.allSettled([
      db.collection("agreements").deleteMany(filter),
      db.collection("moderationLogs").deleteMany(filter),
    ]);
    agreementsDeleted = agreementsResult.status === "fulfilled" ? agreementsResult.value.deletedCount ?? 0 : 0;
    moderationLogsDeleted = modResult.status === "fulfilled" ? modResult.value.deletedCount ?? 0 : 0;
    if (agreementsResult.status === "rejected") {
      console.error("[api/account] Failed to delete agreements", agreementsResult.reason);
    }
    if (modResult.status === "rejected") {
      console.error("[api/account] Failed to delete moderationLogs", modResult.reason);
    }
    console.log("[api/account] Mongo data deleted", { userId, agreementsDeleted, moderationLogsDeleted });
  } catch (error) {
    console.error("[api/account] Failed to delete Mongo data", error);
    return send(500, { error: "Failed to delete your stored data." });
  }

  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    console.error("[api/account] CLERK_SECRET_KEY is not configured");
    return send(500, {
      error:
        "Account deletion is not configured on the server. Your stored data was removed, but the account could not be deleted.",
    });
  }

  try {
    const apiBase = (process.env.CLERK_API_URL || "https://api.clerk.com").replace(/\/$/, "");
    const clerkRes = await fetch(`${apiBase}/v1/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!clerkRes.ok) {
      const payload = await clerkRes.text().catch(() => "");
      console.error("[api/account] Clerk deletion failed", {
        userId,
        status: clerkRes.status,
        payload: payload.slice(0, 500),
      });
      return send(502, {
        error: "Your stored data was removed, but the account could not be deleted. Please try again.",
      });
    }

    console.log("[api/account] Clerk account deleted", { userId });
    return send(200, { ok: true, agreementsDeleted, moderationLogsDeleted, clerkDeleted: true });
  } catch (error) {
    console.error("[api/account] Clerk deletion error", error);
    return send(502, {
      error: "Your stored data was removed, but the account could not be deleted. Please try again.",
    });
  }
}

export async function legalConsentHandler(req, res) {
  const send = (status, payload) => {
    if (res.code && typeof res.code === "function") return res.code(status).send(payload);
    if (res.status && typeof res.status === "function") return res.status(status).json(payload);
    if (res.json && typeof res.json === "function") return res.json(payload);
  };

  try {
    const { accepted, timestamp } = req.body ?? {};

    if (typeof accepted !== "boolean") {
      return send(400, { error: "accepted (boolean) is required" });
    }
    const parsedTimestamp = timestamp ? new Date(timestamp) : null;
    if (!parsedTimestamp || Number.isNaN(parsedTimestamp.getTime())) {
      return send(400, { error: "A valid timestamp is required" });
    }
    const ageBracket = req.body?.ageBracket;
    const validAgeBrackets = new Set(["under13", "13-17", "18+"]);
    const sanitizedAgeBracket =
      typeof ageBracket === "string" && validAgeBrackets.has(ageBracket)
        ? ageBracket
        : null;

    const db = await getDb();
    const collection = db.collection("agreements");
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return send(400, { error: "Could not determine the authenticated user" });
    }
    const filter = { clerkId, type: "legal-consent" };
    const update = {
      $set: {
        accepted,
        clerkId,
        ageBracket: sanitizedAgeBracket,
        deviceIp: anonymizeIp(getClientIp(req)),
        userAgent: hashUserAgent(getUserAgent(req)),
        timestamp: parsedTimestamp,
        type: "legal-consent",
        privacyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        updatedAt: new Date(),
      },
      $unset: { email: "", emailVerified: "", emailSource: "" },
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

    await collection.updateOne(filter, update, { upsert: true });
    console.log("[api/legal-consent] Legal consent saved", {
      clerkId,
      accepted,
      timestamp: parsedTimestamp,
    });

    return send(200, { ok: true });
  } catch (error) {
    console.error("[api/legal-consent] Failed to save legal consent", error);
    return send(500, { error: "Failed to save legal consent" });
  }
}

export async function legalConsentStatusHandler(req, res) {
  const send = (status, payload, cacheHeader) => {
    if (res.header && typeof res.header === "function") res.header("Cache-Control", cacheHeader);
    else if (res.setHeader && typeof res.setHeader === "function") res.setHeader("Cache-Control", cacheHeader);

    if (res.code && typeof res.code === "function") return res.code(status).send(payload);
    if (res.status && typeof res.status === "function") return res.status(status).json(payload);
    if (res.json && typeof res.json === "function") return res.json(payload);
  };

  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return send(400, { error: "Could not determine the authenticated user" }, "private, no-store");
    }

    const db = await getDb();
    const agreement = await db.collection("agreements").findOne({ clerkId, type: "legal-consent" });

    if (agreement) {
      return send(
        200,
        {
          accepted: agreement.accepted,
          privacyVersion: agreement.privacyVersion,
          termsVersion: agreement.termsVersion,
        },
        "private, max-age=300"
      );
    } else {
      return send(200, { accepted: false }, "private, max-age=60");
    }
  } catch (error) {
    console.error("[api/legal-consent/status] Failed to fetch status", error);
    return send(500, { error: "Failed to fetch legal consent status" }, "private, no-store");
  }
}

export async function exportDataHandler(req, res) {
  const send = (status, payload) => {
    if (res.code && typeof res.code === "function") return res.code(status).send(payload);
    if (res.status && typeof res.status === "function") return res.status(status).json(payload);
    if (res.json && typeof res.json === "function") return res.json(payload);
  };

  try {
    const userId = req.auth?.userId;
    const email = getAuthEmail(req.auth);

    if (!userId) {
      return send(400, { error: "Could not determine the user." });
    }

    const db = await getDb();
    const filter = { clerkId: userId };
    const EXPORT_DOC_CAP = 10_000;
    const [agreements, moderationLogs] = await Promise.all([
      db.collection("agreements").find(filter).limit(EXPORT_DOC_CAP).toArray(),
      db.collection("moderationLogs").find(filter).limit(EXPORT_DOC_CAP).toArray(),
    ]);

    const safeFilenameId = String(userId).replace(/[^\w.-]/g, "_").slice(0, 64);
    const setHeader = (k, v) => {
      if (res.header && typeof res.header === "function") res.header(k, v);
      else if (res.setHeader && typeof res.setHeader === "function") res.setHeader(k, v);
    };
    setHeader("Content-Type", "application/json");
    setHeader("Content-Disposition", `attachment; filename="reallearn-data-${safeFilenameId}.json"`);
    // This payload is the user's complete stored personal data — it must
    // never land in any shared/proxy cache or be replayed from disk cache.
    setHeader("Cache-Control", "private, no-store");

    return send(200, {
      exportedAt: new Date().toISOString(),
      user: {
        clerkId: userId,
        email,
      },
      agreements,
      moderationLogs,
    });
  } catch (error) {
    console.error("[api/export-data] Failed to export data", error);
    return send(500, { error: "Failed to export data" });
  }
}

const agreementResponseSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
        },
      },
    },
  },
};

const agreementStatusResponseSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          accepted: { type: "boolean" },
          cookieVersion: { type: ["string", "null"] },
        },
      },
    },
  },
};

const legalConsentResponseSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
        },
      },
    },
  },
};

const legalConsentStatusResponseSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          accepted: { type: "boolean" },
          privacyVersion: { type: ["string", "null"] },
          termsVersion: { type: ["string", "null"] },
        },
      },
    },
  },
};

const accountDeleteResponseSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          agreementsDeleted: { type: "number" },
          moderationLogsDeleted: { type: "number" },
          clerkDeleted: { type: "boolean" },
        },
      },
    },
  },
};

export default async function accountRoutes(fastify) {
  fastify.post("/api/agreement", { preHandler: [apiRateLimiter, requireAuth], ...agreementResponseSchema }, agreementHandler);
  fastify.get("/api/agreement/status", { preHandler: [apiRateLimiter, requireAuth], ...agreementStatusResponseSchema }, agreementStatusHandler);
  fastify.delete("/api/account", { preHandler: [apiRateLimiter, requireAuth], ...accountDeleteResponseSchema }, accountDeleteHandler);
  fastify.post("/api/legal-consent", { preHandler: [apiRateLimiter, requireAuth], ...legalConsentResponseSchema }, legalConsentHandler);
  fastify.get("/api/legal-consent/status", { preHandler: [apiRateLimiter, requireAuth], ...legalConsentStatusResponseSchema }, legalConsentStatusHandler);
  fastify.get("/api/export-data", { preHandler: [apiRateLimiter, requireAuth] }, exportDataHandler);
}
