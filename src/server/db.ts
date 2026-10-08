import { MongoClient, type Db } from "mongodb";

const globalDb = globalThis as typeof globalThis & {
  mongoPromise?: Promise<MongoClient>;
};
export async function mongo(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI)
    throw new Error("MONGODB_URI is not configured");
  if (!globalDb.mongoPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 15,
      serverSelectionTimeoutMS: 8000,
    });
    globalDb.mongoPromise = client.connect().catch((error) => {
      globalDb.mongoPromise = undefined;
      throw error;
    });
  }
  return globalDb.mongoPromise;
}
export async function db(): Promise<Db> {
  return (await mongo()).db(process.env.MONGODB_DB || "dazzle_store");
}
