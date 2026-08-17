// Privacy helpers shared by the consent/account routes and the startup
// migrations that retroactively scrub legacy records.
import crypto from "node:crypto";
import { Address4, Address6 } from "ip-address";

// Privacy: salt for hashing User-Agent strings. The salt must be STABLE
// across restarts/instances or the stored hashes are useless for their
// stated purpose (detecting repeat-device consent fraud) — a per-process
// random salt would produce a different hash for the same device after
// every deploy. Configure UA_HASH_SALT in the environment.
// Fallback: derive a stable value from CLERK_ISSUER only (not MONGODB_URI,
// which may contain credentials). If neither is set, warn and use a fixed
// placeholder — fraud detection is weakened until UA_HASH_SALT is configured.
const UA_HASH_SALT =
  process.env.UA_HASH_SALT ||
  (process.env.CLERK_ISSUER
    ? crypto.createHash("sha256").update(`reallearn-ua-salt:${process.env.CLERK_ISSUER}`).digest("hex")
    : "reallearn-default-ua-salt-not-configured");
if (!process.env.UA_HASH_SALT) {
  console.warn(
    "[privacy] UA_HASH_SALT is not configured. User-Agent hashes are derived from CLERK_ISSUER (or a fixed fallback), which is stable but less secure than an explicit secret. Set UA_HASH_SALT in production."
  );
}
export function hashUserAgent(ua) {
  if (typeof ua !== "string" || !ua) return "unknown";
  return crypto.createHash("sha256").update(`${UA_HASH_SALT}:${ua}`).digest("hex").slice(0, 32);
}

// Privacy (GDPR/DPDP data minimization, policy v2.3): consent records used to
// store the RAW client IP indefinitely. A full IP address is personal data,
// and keeping it forever in permanent consent records is disproportionate to
// the purpose (coarse fraud/abuse signals on consent events). Truncate the
// last IPv4 octet / the IPv6 interface bits before storage — the same
// anonymization approach Google Analytics uses — so the record keeps a
// network-level signal without identifying a specific device.
export function anonymizeIp(ip) {
  if (typeof ip !== "string" || !ip) return "unknown";
  const candidate = ip.trim();

  if (candidate.includes("::ffff:")) {
    const v4Part = candidate.split("%")[0].replace(/^::ffff:/, "");
    try {
      const addr = new Address4(v4Part);
      return addr.parsedAddress.slice(0, 3).concat(["0"]).join(".");
    } catch {
      return "unknown";
    }
  }

  try {
    const addr6 = new Address6(candidate);
    const groups = addr6.parsedAddress;
    return `${groups.slice(0, 3).join(":")}::`;
  } catch {
    try {
      const addr = new Address4(candidate);
      return addr.parsedAddress.slice(0, 3).concat(["0"]).join(".");
    } catch {
      return "unknown";
    }
  }
}
