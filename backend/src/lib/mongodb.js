import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGODB_URL;
const MONGODB_DB = process.env.MONGODB_DB || "reallearn";

if (!MONGODB_URI) {
  console.warn("[MongoDB] Neither MONGODB_URI nor MONGODB_URL is set — database features will fail at runtime");
}

let client = null;
let clientPromise = null;

async function getMongoClient() {
  if (clientPromise) return clientPromise;
  if (!MONGODB_URI) {
    throw new Error("MongoDB connection failed: MONGODB_URI is not configured");
  }

  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect().then((connectedClient) => {
    console.log("[MongoDB] Connected successfully");
    return connectedClient;
  }).catch((error) => {
    // RELIABILITY: never cache a REJECTED connection promise. Without this,
    // one transient DNS/network blip during the first connect permanently
    // poisoned `clientPromise` — every later getDb() re-returned the same
    // rejected promise and all DB-backed endpoints 500'd until a manual
    // restart. Reset so the next request retries the connection.
    clientPromise = null;
    const failedClient = client;
    client = null;
    // Best-effort teardown of the half-open client (ignore close errors).
    failedClient?.close?.().catch(() => {});
    throw error;
  });

  return clientPromise;
}

export async function getDb() {
  const connectedClient = await getMongoClient();
  return connectedClient.db(MONGODB_DB);
}
