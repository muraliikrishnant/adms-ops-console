import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

function getClient(): MongoClient {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error(
        "MONGODB_URI is not set. Provision MongoDB Atlas (vercel integration add mongodb-atlas) " +
          "or set MONGODB_URI in .env.local for a local/manual connection string.",
      );
    }
    client = new MongoClient(uri);
  }
  return client;
}

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = getClient()
      .connect()
      .then((c) => c.db(process.env.MONGODB_DB || "adms"));
  }
  return dbPromise;
}
