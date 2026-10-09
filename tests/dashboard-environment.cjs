// Test preparation and cleanup never target the configured application database.
const { MongoClient } = require("mongodb");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
require("@next/env").loadEnvConfig(process.cwd());
const file = "test-results/dashboard/environment.json";
async function main() {
  const mode = process.argv[2];
  const client = new MongoClient(process.env.MONGODB_URI); await client.connect();
  try {
    const source = client.db(process.env.MONGODB_DB || "dazzle_store");
    const config = mode === "prepare" ? { database: `dazzle_dashboard_test_${Date.now()}`, base: "http://127.0.0.1:3100" } : JSON.parse(readFileSync(file, "utf8"));
    if (!/^dazzle_dashboard_test_\d+$/.test(config.database) || config.database === source.databaseName) throw new Error("Refusing an unsafe test database target.");
    const isolated = client.db(config.database);
    if (mode === "prepare") {
      mkdirSync("test-results/dashboard", { recursive: true });
      for (const collection of ["products", "categories", "brands", "content"]) {
        const rows = await source.collection(collection).find({}).toArray();
        if (rows.length) await isolated.collection(collection).insertMany(rows);
      }
      const store = await source.collection("settings").findOne({ key: "store" });
      if (store) await isolated.collection("settings").insertOne(store);
      const demo = existsSync(".dashboard-test-credentials.json") ? JSON.parse(readFileSync(".dashboard-test-credentials.json", "utf8")) : {};
      const emails = [process.env.ADMIN_EMAIL?.toLowerCase(), demo.customer?.email, demo.staff?.email].filter(Boolean);
      const users = await source.collection("users").find({ email: { $in: emails } }).toArray();
      if (users.length) await isolated.collection("users").insertMany(users);
      const counts = await source.collection("products").aggregate([{ $group: { _id: null, count: { $sum: 1 }, stock: { $sum: "$stock" } } }]).next();
      config.baseline = { products: counts?.count, stock: counts?.stock, orders: await source.collection("orders").countDocuments({}) };
      writeFileSync(file, JSON.stringify(config, null, 2));
      console.log(`Prepared isolated dashboard database with ${counts?.count} products. No orders or integration credentials were copied.`);
    } else if (mode === "clear-rates") { await isolated.collection("rateLimits").deleteMany({}); console.log("Cleared isolated test rate limits."); }
    else if (mode === "cleanup") {
      await isolated.dropDatabase();
      const counts = await source.collection("products").aggregate([{ $group: { _id: null, count: { $sum: 1 }, stock: { $sum: "$stock" } } }]).next();
      const current = { products: counts?.count, stock: counts?.stock, orders: await source.collection("orders").countDocuments({}) };
      if (JSON.stringify(current) !== JSON.stringify(config.baseline)) throw new Error("Application counts changed during testing; review the stored baseline.");
      console.log("Removed isolated test database. Application product, stock and order counts are unchanged.");
    } else throw new Error("Choose prepare, clear-rates or cleanup.");
  } finally { await client.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
