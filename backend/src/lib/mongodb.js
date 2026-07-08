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
  });

  return clientPromise;
}

export async function getDb() {
  const connectedClient = await getMongoClient();
  return connectedClient.db(MONGODB_DB);
}
