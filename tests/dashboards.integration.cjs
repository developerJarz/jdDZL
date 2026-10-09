const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { MongoClient } = require("mongodb");
const { hash } = require("bcryptjs");
require("@next/env").loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const accounts = JSON.parse(readFileSync(".dashboard-test-credentials.json", "utf8"));
const cookies = {};
const prefix = `dashboard-test-${Date.now()}`;
let checks = 0;
const pass = message => { checks++; console.log("PASS", message); };
async function request(path, actor, input) {
  const response = await fetch(`${base}/api/commerce/${path}`, { method: input ? "POST" : "GET", headers: { origin: base, "content-type": "application/json", ...(cookies[actor] ? { cookie: cookies[actor] } : {}) }, ...(input ? { body: JSON.stringify(input) } : {}) });
  const cookie = response.headers.get("set-cookie"); if (cookie) cookies[actor] = cookie.split(";")[0];
  return { status: response.status, data: await response.json() };
}
async function main() {
  if (!/^dazzle_dashboard_test_\d+$/.test(process.env.MONGODB_DB || "")) throw new Error("Use the isolated dashboard database.");
  const client = new MongoClient(process.env.MONGODB_URI); await client.connect(); const db = client.db(process.env.MONGODB_DB);
  const limitedEmail = `${prefix}@example.test`, password = "Dashboard-test-123!";
  try {
    assert.equal((await request("admin/workspace", "anonymous")).status, 401); pass("Anonymous staff workspace is protected");
    for (const role of ["customer", "staff"]) {
      assert.equal((await request("auth/login", role, { username: accounts[role].email, password: accounts[role].password })).status, 200); pass(`${role} test credentials authenticate`);
    }
    assert.equal((await request("admin/workspace", "customer")).status, 403); pass("Customer cannot enter the staff API");
    const staff = await db.collection("users").findOne({ email: accounts.staff.email });
    const customer = await db.collection("users").findOne({ email: accounts.customer.email });
    const workspace = (await request("admin/workspace", "staff")).data;
    assert.equal(workspace.profile.email, accounts.staff.email);
    assert.ok(workspace.queues.some(q => q.id === "support"));
    assert.ok(workspace.queues.some(q => q.id === "inventory"));
    assert.equal("passwordHash" in workspace.profile, false); pass("Staff workspace returns permitted live queues and a safe profile");
    for (const resource of ["staff", "integrations"]) assert.equal((await request(`admin/${resource}`, "staff")).status, 403);
    assert.equal((await request("admin/settings", "staff", {})).status, 403);
    pass("Manager cannot change store settings or access integrations and staff administration");
    assert.equal((await request("account/profile", "staff", { name: "Demo Staff Updated", phone: "", role: "admin", permissions: ["settings"] })).status, 200);
    const changed = await db.collection("users").findOne({ _id: staff._id });
    assert.equal(changed.role, "staff"); assert.deepEqual(changed.permissions, staff.permissions); assert.equal("phone" in changed, false);
    pass("Staff can update their profile without elevating privileges or requiring a phone");
    assert.equal((await request("account/profile", "staff", { name: staff.name, phone: "" })).status, 200);
    await db.collection("users").insertOne({ name: "Limited Cashier", email: limitedEmail, passwordHash: await hash(password, 12), role: "staff", staffRole: "Cashier", permissions: ["orders", "pos"], active: true, createdAt: new Date() });
    assert.equal((await request("auth/login", "limited", { username: limitedEmail, password })).status, 200);
    const limited = (await request("admin/workspace", "limited")).data;
    assert.deepEqual(limited.queues.map(q => q.id), ["pending", "assigned", "incomplete"]);
    const badges = (await request("admin/badges", "limited")).data;
    for (const key of ["activeProducts", "archived", "lowStock", "outOfStock", "openTickets", "pendingReviews", "newMessages"]) assert.equal(badges[key], 0, key);
    assert.equal((await request("admin/reports", "limited")).status, 403);
    assert.equal((await request("admin/operations/stock", "limited", { slug: prefix, delta: 1, reason: "Unauthorized adjustment" })).status, 403);
    pass("Cashier queues and writes are restricted to assigned permissions");
    const inserted = await db.collection("products").insertOne({ name: "Dashboard test phone", slug: prefix, code: prefix, price: 1500, regularPrice: 1800, costPrice: 900, stock: 10, inStock: true, active: true, isTba: false, endOfLife: false, categorySlugs: ["phone"], subCategorySlugs: [], images: [], image: null, createdAt: new Date(), updatedAt: new Date() });
    const input = { customer: { name: customer.name, email: customer.email, phone: customer.phone, address: "House 10, Road 2, Dhaka", city: "Dhaka" }, items: [{ slug: prefix, qty: 1 }], coupon: "", delivery: "delivery", note: "Dashboard test", paymentMethod: "cod", idempotencyKey: randomUUID() };
    const quote = await request("checkout/quote", "customer", input); assert.equal(quote.status, 200); assert.equal("cost" in quote.data.lines[0], false); pass("Checkout quotes hide purchase costs");
    const result = await request("orders", "customer", input); assert.equal(result.status, 201); const order = result.data.order;
    assert.equal("cost" in order.items[0], false); assert.equal("ip" in order, false); pass("Order creation returns customer-safe data");
    await db.collection("orders").updateOne({ orderNo: order.orderNo }, { $set: { assignedTo: { id: staff._id.toString(), name: staff.name } } });
    const updatedWorkspace = (await request("admin/workspace", "staff")).data;
    assert.ok(updatedWorkspace.assigned.some(o => o.orderNo === order.orderNo));
    assert.equal(updatedWorkspace.queues.find(q => q.id === "assigned").count, 1); pass("Assigned orders and queue counts update from real records");
    const dashboard = (await request("account/dashboard", "customer")).data;
    assert.equal(dashboard.orders.length, 1); assert.equal("cost" in dashboard.orders[0].items[0], false); assert.equal("assignedTo" in dashboard.orders[0], false);
    const listed = (await request("orders", "customer")).data.items;
    assert.equal("cost" in listed[0].items[0], false); pass("Customer dashboard and order history exclude internal data");
    const outsider = (await request("orders", "limited")).data.items; assert.equal(outsider.length, 0); pass("Other signed-in users cannot read this customer's orders");
    const invoice = await fetch(`${base}/account/invoice/${order.orderNo}`, { headers: { cookie: cookies.customer } }); assert.equal(invoice.status, 200); assert.ok((await invoice.text()).includes(order.orderNo));
    const staffInvoice = await fetch(`${base}/account/invoice/${order.orderNo}`, { headers: { cookie: cookies.limited } }); assert.equal(staffInvoice.status, 200);
    assert.equal((await request("auth/register", "other", { name: "Other Dashboard Customer", email: `${prefix}-other@example.test`, phone: "019" + String(Date.now()).slice(-8), password })).status, 201);
    const deniedInvoice = await fetch(`${base}/account/invoice/${order.orderNo}`, { headers: { cookie: cookies.other } }); assert.equal(deniedInvoice.status, 404); pass("Invoices are limited to the customer and authorized order staff");
    assert.equal((await request("account/cancel", "customer", { orderNo: order.orderNo })).status, 200); assert.equal((await db.collection("products").findOne({ _id: inserted.insertedId })).stock, 10); pass("Customer cancellation restores stock exactly");
    await db.collection("users").updateOne({ email: limitedEmail }, { $set: { active: false } });
    assert.equal((await request("admin/workspace", "limited")).status, 401); pass("Deactivated staff lose access immediately");
    assert.equal((await request("auth/logout", "customer", {})).status, 200); assert.equal((await request("account/dashboard", "customer")).status, 401); pass("Logout invalidates the customer session");
    console.log(`Passed ${checks} dashboard integration checks.`);
  } finally {
    const users = await db.collection("users").find({ email: { $in: [limitedEmail, `${prefix}-other@example.test`] } }).toArray();
    await db.collection("sessions").deleteMany({ userId: { $in: users.map(u => u._id.toString()) } });
    await db.collection("users").deleteMany({ _id: { $in: users.map(u => u._id) } });
    await db.collection("orders").deleteMany({ "items.slug": prefix }); await db.collection("products").deleteMany({ slug: prefix }); await db.collection("stockMovements").deleteMany({ slug: prefix });
    await client.close();
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
