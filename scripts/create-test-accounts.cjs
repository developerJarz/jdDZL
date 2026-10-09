// Creates two explicitly marked demo accounts without changing existing owner or customer accounts.
const { MongoClient } = require("mongodb");
const { hash, compare } = require("bcryptjs");
const { randomBytes, randomInt } = require("node:crypto");
const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
require("@next/env").loadEnvConfig(process.cwd());
const credentialPath = resolve(".dashboard-test-credentials.json");
const accounts = [
  { key: "customer", email: "customer.demo@dazzle.bd", name: "Demo Customer", role: "customer", path: "/auth/login" },
  { key: "staff", email: "staff.demo@dazzle.bd", name: "Demo Staff", role: "staff", staffRole: "Store manager", permissions: ["overview", "orders", "pos", "customers", "coupons", "products", "inventory", "purchases", "expenses", "reports", "storefront", "marketing", "engagement"], path: "/admin/login" },
];
async function main() {
  if (!process.argv.includes("--create")) throw new Error("Use --create to create the requested demo accounts.");
  const saved = existsSync(credentialPath) ? JSON.parse(readFileSync(credentialPath, "utf8")) : {};
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const database = client.db(process.env.MONGODB_DB || "dazzle_store");
    const result = { ...saved, createdAt: saved.createdAt || new Date().toISOString() };
    for (const account of accounts) {
      const existing = await database.collection("users").findOne({ email: account.email });
      if (existing) {
        if (!existing.testAccount || !saved[account.key] || !(await compare(saved[account.key].password, existing.passwordHash)))
          throw new Error(`An account already uses ${account.email}; its password was left unchanged.`);
        result[account.key] = saved[account.key];
        continue;
      }
      const password = `Dz!${randomBytes(12).toString("base64url")}7a`;
      const document = { email: account.email, name: account.name, role: account.role, passwordHash: await hash(password, 12), active: true, testAccount: true, addresses: [], wishlist: [], createdAt: new Date(), updatedAt: new Date() };
      if (account.permissions) Object.assign(document, { permissions: account.permissions, staffRole: account.staffRole });
      if (account.role === "customer") {
        let phone;
        do { phone = "017" + randomInt(10000000, 100000000); } while (await database.collection("users").findOne({ phone }));
        document.phone = phone;
      }
      const inserted = await database.collection("users").insertOne(document);
      result[account.key] = { email: account.email, password, path: account.path, name: account.name };
      // Save after each creation so a later failure never loses access to a created account.
      writeFileSync(credentialPath, JSON.stringify(result, null, 2) + "\n");
      await database.collection("audit").insertOne({ action: "test-account.create", entityId: inserted.insertedId.toString(), detail: `Created ${account.role} dashboard test account`, createdAt: new Date() });
    }
    writeFileSync(resolve(".test-credentials.txt"), accounts.map(account => `${account.name}\nLogin: ${result[account.key].path}\nEmail: ${result[account.key].email}\nPassword: ${result[account.key].password}\n`).join("\n"));
    console.log("Customer and staff test accounts are ready. Credentials saved to the two ignored credential files.");
  } finally { await client.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
