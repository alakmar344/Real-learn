import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  "mongodb://localhost:27017";
const MONGODB_DB = process.env.MONGODB_DB || "reallearn";

let client = null;
let clientPromise = null;

export async function getMongoClient() {
  if (clientPromise) return clientPromise;

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
