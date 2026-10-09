const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { MongoClient } = require("mongodb");
require("@next/env").loadEnvConfig(process.cwd());
const origin = process.env.TEST_BASE_URL || "http://localhost:3001";
const prefix = "codex-test-" + Date.now();
const email = prefix + "@example.com";
const slug = prefix + "-phone";
const couponCode = "TEST-" + Date.now();
const testPhone = "017" + String(Date.now()).slice(-8);
const clients = { admin: "", customer: "", other: "" };
let checks = 0;
const pass = (message) => {
  checks++;
  console.log("PASS", message);
};
async function request(path, options = {}, actor = "admin") {
  const response = await fetch(origin + "/api/commerce/" + path, {
    ...options,
    headers: {
      "content-type": "application/json",
      origin,
      ...(clients[actor] ? { cookie: clients[actor] } : {}),
      ...options.headers,
    },
  });
  const cookie = response.headers.get("set-cookie");
  if (cookie && actor) clients[actor] = cookie.split(";")[0];
  const data = await response.json();
  return { response, data };
}
const send = (path, data, actor = "admin", method = "POST") =>
  request(path, { method, body: JSON.stringify(data) }, actor);
async function main() {
  const mongo = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  await mongo.connect();
  const database = mongo.db(process.env.MONGODB_DB || "dazzle_store");
  const entityIds = [];
  const mediaIds = [];
  try {
    assert.equal((await request("health")).response.status, 200);
    pass("MongoDB health");
    assert.equal((await request("admin/overview")).response.status, 401);
    pass("anonymous admin access denied");
    assert.equal(
      (
        await request("auth/login", {
          method: "POST",
          headers: { origin: "https://untrusted.example" },
          body: "{}",
        })
      ).response.status,
      403,
    );
    pass("cross-origin mutation rejected");
    assert.equal(
      (
        await send("auth/login", {
          username: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        })
      ).response.status,
      200,
    );
    pass("administrator authentication");
    assert.equal((await request("admin/overview")).data.products, await database.collection("products").countDocuments({ active: { $ne: false } }));
    pass("imported catalog and live analytics");
    const product = {
      name: prefix + " Phone",
      slug,
      code: prefix,
      price: 1000,
      regularPrice: 1200,
      stock: 3,
      brandSlug: "apple",
      brandName: "Apple",
      categorySlugs: ["smartphone"],
      imageSrc: "",
      badge: "",
      active: true,
    };
    assert.equal(
      (await send("admin/products", { ...product, stock: -1 })).response.status,
      400,
    );
    pass("invalid stock rejected");
    let result = await send("admin/products", product);
    assert.equal(result.response.status, 201);
    entityIds.push(result.data.id);
    pass("product creation");
    const imageForm = new FormData();
    imageForm.set(
      "image",
      new Blob(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5RkAAAAASUVORK5CYII=",
            "base64",
          ),
        ],
        { type: "image/png" },
      ),
      "test.png",
    );
    const imageResponse = await fetch(origin + "/api/commerce/admin/media", {
      method: "POST",
      headers: { origin, cookie: clients.admin },
      body: imageForm,
    });
    assert.equal(imageResponse.status, 201);
    const image = await imageResponse.json();
    mediaIds.push(image.src.split("/").at(-1));
    const publicImage = await fetch(origin + image.src);
    assert.equal(publicImage.headers.get("content-type"), "image/png");
    assert.ok((await publicImage.arrayBuffer()).byteLength > 0);
    pass("authenticated image upload and public image delivery");
    const invalidImage = new FormData();
    invalidImage.set(
      "image",
      new Blob(["<svg onload='alert(1)'></svg>"], { type: "image/svg+xml" }),
      "unsafe.svg",
    );
    assert.equal(
      (
        await fetch(origin + "/api/commerce/admin/media", {
          method: "POST",
          headers: { origin, cookie: clients.admin },
          body: invalidImage,
        })
      ).status,
      400,
    );
    pass("executable image formats rejected");
    const updated = {
      ...product,
      imageSrc: image.src,
      description: "<script>alert('test')</script> Product description",
      shortDescription: "Test product",
    };
    assert.equal(
      (await send("admin/products/" + entityIds[0], updated, "admin", "PATCH"))
        .response.status,
      200,
    );
    const storefront = await fetch(origin + "/api/products?slugs=" + slug);
    const catalogProduct = (await storefront.json()).products[0];
    assert.equal(catalogProduct.image.src, image.src);
    assert.equal(catalogProduct.price, 1000);
    assert.ok(
      (await (await fetch(origin + "/product/" + slug)).text()).includes(
        "&lt;script&gt;",
      ),
    );
    pass(
      "dashboard product edits reach storefront and descriptions are escaped",
    );
    result = await send("admin/coupons", {
      code: couponCode,
      type: "percent",
      value: 10,
      minOrder: 500,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      active: true,
    });
    assert.equal(result.response.status, 201);
    entityIds.push(result.data.id);
    pass("coupon creation");
    result = await send(
      "auth/register",
      {
        name: prefix,
        email,
        phone: testPhone,
        password: randomUUID(),
        role: "admin",
      },
      "customer",
    );
    assert.equal(result.response.status, 201);
    const customer = (await request("auth/me", {}, "customer")).data.user;
    entityIds.push(customer._id);
    assert.equal(customer.role, "customer");
    assert.equal(customer.passwordHash, undefined);
    pass("customer registration cannot escalate privileges");
    assert.equal(
      (await request("admin/products", {}, "customer")).response.status,
      403,
    );
    pass("customer admin access denied");
    const payload = {
      customer: {
        name: prefix,
        email,
        phone: testPhone,
        address: "123 Test Avenue, Dhaka",
        city: "Dhaka",
      },
      items: [{ slug, qty: 2, price: 1 }],
      coupon: couponCode,
      idempotencyKey: randomUUID(),
    };
    for (const flag of ["isTba", "endOfLife"]) {
      assert.equal(
        (
          await send(
            "admin/products/" + entityIds[0],
            { ...updated, [flag]: true },
            "admin",
            "PATCH",
          )
        ).response.status,
        200,
      );
      assert.equal(
        (
          await send(
            "checkout/quote",
            { items: payload.items, coupon: payload.coupon },
            "customer",
          )
        ).response.status,
        409,
      );
      assert.equal(
        (
          await send(
            "admin/products/" + entityIds[0],
            { ...updated, [flag]: false },
            "admin",
            "PATCH",
          )
        ).response.status,
        200,
      );
      pass(`${flag} availability can be managed and blocks checkout when set`);
    }
    result = await send(
      "checkout/quote",
      { items: payload.items, coupon: payload.coupon },
      "customer",
    );
    assert.equal(result.response.status, 200);
    assert.equal(result.data.subtotal, 2000);
    assert.equal(result.data.discount, 200);
    const quotedTotal = result.data.total;
    pass("server prices and real coupon discount");
    result = await send("orders", payload, "customer");
    assert.equal(result.response.status, 201);
    const order = result.data.order;
    entityIds.push(order._id);
    assert.equal(order.total, quotedTotal);
    assert.equal(
      (await database.collection("products").findOne({ slug })).stock,
      1,
    );
    pass("order and stock transaction");
    result = await send("orders", payload, "customer");
    assert.equal(result.data.order._id, order._id);
    assert.equal(
      (await database.collection("products").findOne({ slug })).stock,
      1,
    );
    pass("checkout retry creates no duplicate order or stock deduction");
    assert.equal(
      (
        await send(
          "orders",
          { ...payload, idempotencyKey: randomUUID() },
          "customer",
        )
      ).response.status,
      409,
    );
    pass("insufficient inventory rejected");
    for (const status of ["confirmed", "processing", "shipped", "delivered"])
      assert.equal(
        (await send("admin/orders/" + order._id, { status }, "admin", "PATCH"))
          .response.status,
        200,
      );
    assert.equal(
      (
        await send(
          "admin/orders/" + order._id,
          { status: "cancelled" },
          "admin",
          "PATCH",
        )
      ).response.status,
      409,
    );
    pass("order lifecycle and terminal-state protection");
    const one = { ...payload, coupon: "", items: [{ slug, qty: 1 }] };
    const simultaneous = await Promise.all([
      send("orders", { ...one, idempotencyKey: randomUUID() }, "customer"),
      send("orders", { ...one, idempotencyKey: randomUUID() }, "customer"),
    ]);
    assert.deepEqual(
      simultaneous.map((r) => r.response.status).sort(),
      [201, 409],
    );
    const reserved = simultaneous.find((r) => r.response.status === 201).data
      .order;
    entityIds.push(reserved._id);
    pass("concurrent checkout cannot oversell");
    assert.equal(
      (
        await send(
          "admin/orders/" + reserved._id,
          { status: "cancelled" },
          "admin",
          "PATCH",
        )
      ).response.status,
      200,
    );
    assert.equal(
      (await database.collection("products").findOne({ slug })).stock,
      1,
    );
    pass("cancellation restores stock once");
    assert.equal(
      (
        await send(
          "admin/orders/" + reserved._id,
          { status: "cancelled" },
          "admin",
          "PATCH",
        )
      ).response.status,
      409,
    );
    pass("repeated cancellation cannot inflate inventory");
    result = await send(
      "auth/register",
      {
        name: prefix + " other",
        email: prefix + "-other@example.com",
        phone: "018" + String(Date.now()).slice(-8),
        password: randomUUID(),
      },
      "other",
    );
    assert.equal(result.response.status, 201);
    entityIds.push((await request("auth/me", {}, "other")).data.user._id);
    assert.equal(
      (await request("orders/" + order.orderNo, {}, "other")).data.items.length,
      0,
    );
    pass("order history isolated by customer");
    assert.equal(
      (
        await send(
          "forms/support",
          { name: prefix, email, message: "Integration test enquiry" },
          "customer",
        )
      ).response.status,
      201,
    );
    const message = await database
      .collection("messages")
      .findOne({ "data.email": email });
    entityIds.push(message._id.toString());
    assert.equal(
      (
        await send(
          "admin/messages/" + message._id,
          { status: "resolved" },
          "admin",
          "PATCH",
        )
      ).response.status,
      200,
    );
    pass("storefront support submission and admin resolution");
    assert.equal(
      (await send("newsletter-subscribe", { email }, "customer")).response
        .status,
      200,
    );
    assert.equal(
      (await send("newsletter-unsubscribe", {}, "customer")).response.status,
      200,
    );
    assert.equal(
      (await database.collection("subscribers").findOne({ email })).active,
      false,
    );
    pass("newsletter subscription and account unsubscribe");
    const overview = (await request("admin/overview")).data;
    assert.ok(overview.revenue >= order.total);
    pass("delivered orders feed analytics");
    assert.equal(
      (await send("auth/logout", {}, "customer")).response.status,
      200,
    );
    assert.equal(
      (await request("orders", {}, "customer")).response.status,
      401,
    );
    pass("logout invalidates the server session");
    console.log(`Completed ${checks} live integration checks.`);
  } finally {
    // Only records generated by this test run are removed.
    const users = await database
      .collection("users")
      .find({ email: { $in: [email, prefix + "-other@example.com"] } })
      .toArray();
    await database
      .collection("sessions")
      .deleteMany({ userId: { $in: users.map((u) => u._id.toString()) } });
    await database
      .collection("users")
      .deleteMany({ email: { $in: [email, prefix + "-other@example.com"] } });
    await database.collection("orders").deleteMany({ "customer.email": email });
    await database.collection("products").deleteMany({ slug });
    await database.collection("stockMovements").deleteMany({ slug });
    await database.collection("coupons").deleteMany({ code: couponCode });
    await database.collection("messages").deleteMany({ "data.email": email });
    await database.collection("subscribers").deleteMany({ email });
    await database
      .collection("audit")
      .deleteMany({ entityId: { $in: entityIds } });
    await database.collection("media").deleteMany({
      _id: {
        $in: mediaIds.map((value) => new (require("mongodb").ObjectId)(value)),
      },
    });
    await mongo.close();
  }
}
main().catch((err) => {
  console.error("Integration check failed:", err.message);
  process.exitCode = 1;
});
