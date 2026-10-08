import nextEnv from "@next/env";
import { hash } from "bcryptjs";
import { readFileSync } from "node:fs";
import { db, mongo } from "../src/server/db.ts";
import { defaultHomeSections } from "../src/lib/home-sections.ts";

nextEnv.loadEnvConfig(process.cwd());
async function setup() {
  const database = await db();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !password || password.length < 12)
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in .env.local.",
    );
  await Promise.all([
    database.collection("products").createIndex({ slug: 1 }, { unique: true }),
    database.collection("products").createIndex({ active: 1, stock: 1 }),
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("users").createIndex(
      { phone: 1 },
      {
        unique: true,
        partialFilterExpression: { phone: { $type: "string" } },
      },
    ),
    database
      .collection("sessions")
      .createIndex({ tokenHash: 1 }, { unique: true }),
    database
      .collection("sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("rateLimits").createIndex({ key: 1 }, { unique: true }),
    database
      .collection("rateLimits")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("orders").createIndex({ orderNo: 1 }, { unique: true }),
    database
      .collection("orders")
      .createIndex({ userId: 1, idempotencyKey: 1 }, { unique: true }),
    database.collection("orders").createIndex({ createdAt: -1 }),
    database.collection("orders").createIndex({ status: 1, updatedAt: -1 }),
    database.collection("coupons").createIndex({ code: 1 }, { unique: true }),
    database
      .collection("subscribers")
      .createIndex({ email: 1 }, { unique: true }),
    database.collection("messages").createIndex({ createdAt: -1 }),
    database.collection("audit").createIndex({ createdAt: -1 }),
    database.collection("tickets").createIndex({ userId: 1, updatedAt: -1 }),
    database.collection("tickets").createIndex({ status: 1, createdAt: -1 }),
    database
      .collection("stockMovements")
      .createIndex({ slug: 1, createdAt: -1 }),
    database
      .collection("reviews")
      .createIndex({ userId: 1, slug: 1 }, { unique: true }),
    database.collection("reviews").createIndex({ slug: 1, status: 1 }),
    database
      .collection("passwordResets")
      .createIndex({ tokenHash: 1 }, { unique: true }),
    database
      .collection("passwordResets")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("categories").createIndex({ slug: 1 }, { unique: true }),
    database.collection("categories").createIndex({ sortOrder: 1 }),
    database.collection("brands").createIndex({ slug: 1 }, { unique: true }),
    database.collection("content").createIndex({ key: 1 }, { unique: true }),
    database.collection("products").createIndex({ categorySlugs: 1 }),
    database.collection("products").createIndex({ brandSlug: 1 }),
    database.collection("media").createIndex({ createdAt: -1 }),
    database.collection("posts").createIndex({ slug: 1 }, { unique: true }),
    database.collection("pages").createIndex({ slug: 1 }, { unique: true }),
    database.collection("landingPages").createIndex({ slug: 1 }, { unique: true }),
    database.collection("colors").createIndex({ name: 1 }, { unique: true }),
    database.collection("sizes").createIndex({ group: 1, name: 1 }, { unique: true }),
    database.collection("suppliers").createIndex({ name: 1 }),
    database.collection("purchases").createIndex({ date: -1 }),
    database.collection("purchases").createIndex({ supplierId: 1 }),
    database.collection("expenses").createIndex({ date: -1 }),
    database.collection("blocklist").createIndex({ value: 1 }, { unique: true }),
    database.collection("incompleteOrders").createIndex({ key: 1 }, { unique: true }),
    database.collection("incompleteOrders").createIndex({ status: 1, updatedAt: -1 }),
    database.collection("paymentIntents").createIndex({ gateway: 1, reference: 1 }, { unique: true }),
    database.collection("smsLogs").createIndex({ createdAt: -1 }),
    database.collection("trackingLogs").createIndex({ createdAt: -1 }),
    database.collection("orders").createIndex({ "customer.phone": 1 }),
    database.collection("orders").createIndex({ "assignedTo.id": 1, createdAt: -1 }),
    database.collection("products").createIndex({ barcode: 1 }),
  ]);
  const products = JSON.parse(
    readFileSync("src/data/generated/products.json", "utf8"),
  );
  const stock = Number(process.env.IMPORT_INITIAL_STOCK || 0);
  if (!Number.isSafeInteger(stock) || stock < 0)
    throw new Error("IMPORT_INITIAL_STOCK must be a nonnegative integer.");
  const result = await database.collection("products").bulkWrite(
    products.map((p: { slug: string }) => ({
      updateOne: {
        filter: { slug: p.slug },
        update: {
          $setOnInsert: {
            ...p,
            stock,
            inStock: stock > 0,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
  );
  // Taxonomy and homepage content become dashboard-managed records. Insert-only, so
  // edits made in the dashboard survive a rerun.
  const taxonomy = JSON.parse(
    readFileSync("src/data/generated/categories.json", "utf8"),
  );
  const categoryResult = await database.collection("categories").bulkWrite(
    taxonomy.categories.map((c: { slug: string }, sortOrder: number) => ({
      updateOne: {
        filter: { slug: c.slug },
        update: {
          $setOnInsert: {
            ...c,
            sortOrder,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
  );
  const brands = JSON.parse(
    readFileSync("src/data/generated/brands.json", "utf8"),
  );
  const brandResult = await database.collection("brands").bulkWrite(
    brands.map((b: { slug: string }) => ({
      updateOne: {
        filter: { slug: b.slug },
        update: {
          $setOnInsert: {
            ...b,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
  );
  const home = JSON.parse(readFileSync("src/data/generated/home.json", "utf8"));
  await database.collection("content").updateOne(
    { key: "home" },
    {
      $setOnInsert: {
        ...home,
        sections: defaultHomeSections(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  // Blog posts become editable records (imported HTML is kept as-is).
  const blogs = JSON.parse(readFileSync("src/data/generated/blogs.json", "utf8"));
  const postResult = await database.collection("posts").bulkWrite(
    blogs.posts.map((p: { slug: string; date: string }) => ({
      updateOne: {
        filter: { slug: p.slug },
        update: {
          $setOnInsert: {
            ...p,
            date: new Date(p.date && !Number.isNaN(Date.parse(p.date)) ? p.date : Date.now()),
            format: "html",
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
  );
  const colors = [["Black", "#111111"], ["White", "#f5f5f5"], ["Silver", "#c0c0c0"], ["Gold", "#d4af37"], ["Blue", "#2f6db5"], ["Green", "#2c8a56"], ["Red", "#c0392b"], ["Pink", "#e8a5b8"], ["Purple", "#6b5bd2"], ["Gray", "#6b7280"]];
  await database.collection("colors").bulkWrite(
    colors.map(([name, hex]) => ({ updateOne: { filter: { name }, update: { $setOnInsert: { name, hex, createdAt: new Date() } }, upsert: true } })),
  );
  const sizes = [
    ...["64GB", "128GB", "256GB", "512GB", "1TB"].map((name, i) => ({ name, group: "Storage", sortOrder: i })),
    ...["4GB", "6GB", "8GB", "12GB", "16GB"].map((name, i) => ({ name, group: "RAM", sortOrder: i })),
    ...["S", "M", "L", "XL"].map((name, i) => ({ name, group: "Strap / apparel", sortOrder: i })),
  ];
  await database.collection("sizes").bulkWrite(
    sizes.map((z) => ({ updateOne: { filter: { group: z.group, name: z.name }, update: { $setOnInsert: { ...z, createdAt: new Date() } }, upsert: true } })),
  );
  const site = JSON.parse(readFileSync("src/data/generated/site.json", "utf8"));
  await database.collection("settings").updateOne(
    { key: "store" },
    {
      $setOnInsert: {
        name: site.name,
        email: site.email,
        phone: site.phone,
        address: site.address,
        shippingFee: 120,
        freeShippingAbove: 10000,
        lowStockThreshold: 5,
        currency: "BDT",
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  await database.collection("users").updateOne(
    { email: adminEmail },
    {
      $setOnInsert: {
        name: "Store Administrator",
        email: adminEmail,
        passwordHash: await hash(password, 12),
        role: "admin",
        active: true,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  console.log(
    `Database ready. Imported ${result.upsertedCount} new products, ${categoryResult.upsertedCount} categories, ${brandResult.upsertedCount} brands, and ${postResult.upsertedCount} blog posts. Existing records were preserved.`,
  );
}
setup()
  .catch((error) => {
    console.error(
      "Database setup failed:",
      error.name,
      String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[redacted]"),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await (await mongo()).close();
    } catch {}
  });
