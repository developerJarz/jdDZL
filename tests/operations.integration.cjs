// Live checks for staff roles, variants, purchases, POS, backend orders, payments, fraud,
// blocking, incomplete orders, coupons, landing pages, CMS pages, reports, and integrations.
// Run against a development database with the dev server running:
//   TEST_BASE_URL=http://localhost:3000 node tests/operations.integration.cjs
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { MongoClient } = require("mongodb");
require("@next/env").loadEnvConfig(process.cwd());
const origin = process.env.TEST_BASE_URL || "http://localhost:3001";
const prefix = "ops-test-" + Date.now();
const slug = prefix + "-tee";
const phone = "019" + String(Date.now()).slice(-8);
const customerEmail = prefix + "@example.com";
const staffEmail = prefix + "-staff@example.com";
const clients = { admin: "", staff: "", customer: "" };
let checks = 0;
const pass = (m) => {
  checks++;
  console.log("PASS", m);
};
async function request(path, options = {}, actor = "admin") {
  const response = await fetch(origin + "/api/commerce/" + path, {
    ...options,
    headers: { "content-type": "application/json", origin, ...(clients[actor] ? { cookie: clients[actor] } : {}), ...options.headers },
  });
  const cookie = response.headers.get("set-cookie");
  if (cookie && actor) clients[actor] = cookie.split(";")[0];
  return { response, data: await response.json().catch(() => null) };
}
const send = (path, data, actor = "admin", method = "POST") => request(path, { method, body: JSON.stringify(data) }, actor);
const ok = (r, status = 200) => {
  assert.equal(r.response.status, status, JSON.stringify(r.data));
  return r.data;
};

async function main() {
  const mongo = await new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).connect();
  const database = mongo.db(process.env.MONGODB_DB || "dazzle_store");
  const savedIntegrations = await database.collection("settings").findOne({ key: "integrations" });
  const savedStore = await database.collection("settings").findOne({ key: "store" });
  const variant = (key) => database.collection("products").findOne({ slug }).then((p) => p.variantStock.find((v) => v.key === key).stock);
  try {
    ok(await send("auth/login", { username: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));

    // ---- Staff roles ----
    const staff = ok(await send("admin/staff", { name: prefix + " Cashier", email: staffEmail, role: "staff", staffRole: "Cashier", permissions: ["pos", "orders"], password: "cashier-pass-1" }), 201);
    ok(await send("auth/login", { username: staffEmail, password: "cashier-pass-1" }, "staff"));
    assert.equal((await request("admin/settings", { method: "PATCH", body: "{}" }, "staff")).response.status, 403);
    assert.equal((await request("admin/staff", {}, "staff")).response.status, 403);
    assert.equal((await request("admin/reports?type=sales", {}, "staff")).response.status, 403);
    ok(await request("admin/products?limit=1", {}, "staff"));
    pass("staff role: allowed areas open, settings/staff/reports blocked");

    // ---- Variant product with barcode ----
    const product = {
      name: prefix + " Tee", slug, code: prefix.toUpperCase(), price: 1000, regularPrice: 1000, stock: 0, brandSlug: null, brandName: null, categorySlugs: [],
      barcode: prefix + "-BC", trackVariants: true, lowStockThreshold: 2,
      variants: [{ name: "Color", options: [{ value: "Black", imageIndex: 0, hex: "#111111" }, { value: "White", imageIndex: 0, hex: "#f5f5f5" }] }],
      variantStock: [
        { key: "Black", stock: 2, price: null, cost: null, sku: prefix + "-BLK", barcode: prefix + "-BLK" },
        { key: "White", stock: 1, price: 1200, cost: null, sku: prefix + "-WHT", barcode: "" },
      ],
    };
    const productId = ok(await send("admin/products", product), 201).id;
    assert.equal((await database.collection("products").findOne({ slug })).stock, 3);
    pass("variant stock totals the product stock");

    // ---- Supplier + purchase receive (weighted cost) ----
    const supplierId = ok(await send("admin/suppliers", { name: prefix + " Supplier", phone: "01700000000" }), 201).id;
    const purchaseId = ok(
      await send("admin/purchases", { supplierId, reference: prefix + "-PO", date: new Date().toISOString(), status: "received", items: [{ slug, variant: "Black", qty: 5, unitCost: 700 }], otherCost: 100, paid: 1000, paymentMethod: "Cash", note: "" }),
      201,
    ).id;
    assert.equal(await variant("Black"), 7);
    assert.equal((await database.collection("products").findOne({ slug })).costPrice, 700);
    const purchase = await database.collection("purchases").findOne({ _id: new (require("mongodb").ObjectId)(purchaseId) });
    assert.equal(purchase.total, 3600);
    assert.equal(purchase.due, 2600);
    ok(await send(`admin/purchases/${purchaseId}/pay`, { amount: 600, method: "bKash" }));
    assert.equal((await database.collection("purchases").findOne({ _id: purchase._id })).due, 2000);
    assert.equal((await send(`admin/purchases/${purchaseId}/receive`, {})).response.status, 409);
    pass("purchase receive adds variant stock, sets cost, tracks payments; double receive blocked");

    // ---- POS sale by barcode ----
    const lookup = ok(await request(`admin/pos/lookup?code=${encodeURIComponent(prefix + "-BLK")}`, {}, "staff"));
    assert.equal(lookup.variant, "Black");
    const posKey = randomUUID();
    const sale = ok(await send("admin/pos/sale", { items: [{ slug, variant: "Black", qty: 2 }], discount: 100, payments: [{ method: "Cash", amount: 2000 }], idempotencyKey: posKey }, "staff"), 201).order;
    assert.equal(sale.total, 1900);
    assert.equal(sale.paidAmount, 1900);
    assert.equal(sale.status, "delivered");
    assert.equal(await variant("Black"), 5);
    ok(await send("admin/pos/sale", { items: [{ slug, variant: "Black", qty: 2 }], discount: 100, payments: [{ method: "Cash", amount: 2000 }], idempotencyKey: posKey }, "staff"));
    assert.equal(await variant("Black"), 5);
    pass("POS barcode lookup, paid counter sale, change, and retry safety");

    // ---- Backend order create / edit / payment / bulk ----
    const created = ok(
      await send("admin/orders/create", {
        customer: { name: prefix + " Buyer", phone, email: "", address: "House 1, Road 2, Dhanmondi", city: "Dhaka" },
        items: [{ slug, variant: "White", qty: 1 }],
        shipping: 60, discount: 0, note: "", status: "confirmed", payment: null, idempotencyKey: randomUUID(),
      }),
      201,
    ).order;
    assert.equal(created.total, 1260);
    assert.equal(await variant("White"), 0);
    const edited = ok(
      await send(`admin/orders/${created._id}/edit`, {
        customer: { name: prefix + " Buyer", phone, email: "", address: "House 1, Road 2, Dhanmondi", city: "Dhaka" },
        items: [{ slug, variant: "Black", qty: 1, unitPrice: 950 }],
        shipping: 80, discount: 30, note: "Edited",
      }, "admin", "PATCH"),
    ).order;
    assert.equal(edited.total, 1000);
    assert.equal(await variant("White"), 1);
    assert.equal(await variant("Black"), 4);
    const partial = ok(await send(`admin/orders/${created._id}/payment`, { amount: 300, method: "bKash", reference: prefix + "-TRX" })).order;
    assert.equal(partial.paymentStatus, "partial");
    assert.equal(partial.dueAmount, 700);
    assert.equal((await send(`admin/orders/${created._id}/payment`, { amount: 900, method: "Cash" })).response.status, 400);
    const bulk = ok(await send("admin/orders/bulk", { ids: [created._id], action: "status", status: "processing" }));
    assert.equal(bulk.affected, 1);
    ok(await send("admin/orders/bulk", { ids: [created._id], action: "assign", staffId: staff.id }));
    const assigned = ok(await request("admin/orders?assigned=me&limit=50", {}, "staff"));
    assert.ok(assigned.items.some((o) => o._id === created._id));
    ok(await send(`admin/orders/${created._id}`, { status: "shipped" }, "admin", "PATCH"));
    ok(await send(`admin/orders/${created._id}`, { status: "delivered" }, "admin", "PATCH"));
    const delivered = await database.collection("orders").findOne({ orderNo: created.orderNo });
    assert.equal(delivered.paymentStatus, "paid");
    assert.equal(delivered.payments.reduce((s, p) => s + p.amount, 0), 1000);
    pass("backend order create, edit with stock diff, partial payment, bulk status/assign, COD settle on delivery");

    // ---- Fraud + blocklist ----
    const fraud = ok(await request(`admin/fraud?phone=${phone}`));
    assert.equal(fraud.delivered, 1);
    assert.equal(fraud.risk, "new");
    ok(await send("auth/register", { name: prefix + " Customer", email: customerEmail, phone: "018" + String(Date.now()).slice(-8), password: "customer-pass-1" }, "customer"), 201);
    ok(await send("admin/blocklist", { type: "phone", value: phone, reason: prefix }), 201);
    const checkout = (extra = {}) => ({
      customer: { name: "Blocked", email: customerEmail, phone, address: "Some long address here", city: "Dhaka" },
      items: [{ slug, qty: 1, variant: "Black" }], coupon: "", idempotencyKey: randomUUID(), ...extra,
    });
    assert.equal((await send("orders", checkout(), "customer")).response.status, 403);
    await database.collection("blocklist").deleteMany({ reason: prefix });
    pass("fraud report counts delivery history; blocked phone cannot check out");

    // ---- Incomplete orders ----
    const draftKey = randomUUID();
    ok(await send("checkout/draft", { key: draftKey, source: "checkout", customer: { name: prefix + " Draft", phone, address: "Somewhere" }, items: [{ slug, qty: 1, variant: "Black" }] }, "customer"));
    const drafts = ok(await request(`admin/incomplete?q=${encodeURIComponent(prefix + " Draft")}`));
    assert.equal(drafts.items.length, 1);
    pass("abandoned checkout captured as an incomplete order");

    // ---- Coupon usage limit + free shipping ----
    const code = ("OPS" + Date.now()).slice(0, 20);
    ok(await send("admin/coupons", { code, type: "fixed", value: 50, minOrder: 0, expiresAt: new Date(Date.now() + 86400e3).toISOString(), active: true, usageLimit: 1, freeShipping: true }), 201);
    const quote = ok(await send("checkout/quote", { items: [{ slug, qty: 1, variant: "Black" }], coupon: code, city: "Sylhet" }, "customer"));
    assert.equal(quote.shipping, 0);
    assert.equal(quote.discount, 50);
    const placed = ok(await send("orders", checkout({ coupon: code, customer: { name: prefix + " C", email: customerEmail, phone: "0181" + String(Date.now()).slice(-7), address: "Some long address here", city: "Dhaka" }, idempotencyKey: draftKey }), "customer"), 201);
    assert.equal(placed.paymentUrl, null);
    assert.equal((await send("checkout/quote", { items: [{ slug, qty: 1, variant: "Black" }], coupon: code }, "customer")).response.status, 400);
    pass("coupon usage limit and free-shipping coupon enforced at checkout");

    // ---- Delivery zones price the quote ----
    await database.collection("settings").updateOne({ key: "store" }, { $set: { shippingZones: [{ id: "z1", name: "Zone one", fee: 77 }], freeShippingAbove: 0 } });
    const zoned = ok(await send("checkout/quote", { items: [{ slug, qty: 1, variant: "Black" }], city: "Dhaka", zone: "z1" }, "customer"));
    assert.equal(zoned.shipping, 77);
    assert.equal((await send("checkout/quote", { items: [{ slug, qty: 1, variant: "Black" }], zone: "nope" }, "customer")).response.status, 400);
    pass("delivery area fee is used by the checkout quote; unknown areas are rejected");

    // ---- Landing page quick order + CMS page ----
    ok(await send("admin/landing", { title: prefix + " Offer", slug: prefix + "-offer", active: true, productSlugs: [slug], blocks: [{ id: "h", type: "hero", heading: "Big offer" }, { id: "o", type: "order", heading: "Order" }] }), 201);
    const lp = await fetch(`${origin}/lp/${prefix}-offer`);
    assert.equal(lp.status, 200);
    assert.ok((await lp.text()).includes("Big offer"));
    const quick = ok(await send(`landing/${prefix}-offer/order`, { name: prefix + " Guest", phone, address: "Road 5, Mirpur, Dhaka", city: "Dhaka", items: [{ slug, qty: 1, variant: "White" }], idempotencyKey: randomUUID() }, ""), 201);
    assert.ok(quick.order.orderNo);
    ok(await send("admin/pages", { title: prefix + " Page", slug: prefix + "-page", content: "# Hello\n\n<script>x</script> **bold**", active: true, showInFooter: false }), 201);
    const page = await (await fetch(`${origin}/${prefix}-page`)).text();
    assert.ok(page.includes("<strong>bold</strong>") && !page.includes("<script>x"));
    pass("landing page renders and takes guest orders; CMS page renders escaped markdown");

    // ---- Expenses + reports ----
    ok(await send("admin/expenses", { date: new Date().toISOString(), category: "Packaging", amount: 250, note: prefix }), 201);
    for (const type of ["sales", "profit", "stock", "stock-alert", "purchase", "expense"]) ok(await request(`admin/reports?type=${type}&group=day`));
    const profit = ok(await request("admin/reports?type=profit&group=month"));
    assert.ok(profit.summary.cogs > 0 && profit.summary.expenses >= 250);
    pass("all six reports respond; profit report subtracts cost of goods and expenses");

    // ---- Integrations masking + SMS without a gateway ----
    ok(await send("admin/integrations", { pixel: { accessToken: "secret-token-abcd1234", testEventCode: "" } }, "admin", "PATCH"));
    let masked = ok(await request("admin/integrations")).integrations;
    assert.equal(masked.pixel.accessToken, "••••1234");
    ok(await send("admin/integrations", { pixel: { accessToken: masked.pixel.accessToken, testEventCode: "TEST1" } }, "admin", "PATCH"));
    const stored = await database.collection("settings").findOne({ key: "integrations" });
    assert.equal(stored.pixel.accessToken, "secret-token-abcd1234");
    pass("integration secrets are masked and preserved when the mask is sent back");
    if (!savedIntegrations?.sms?.provider) {
      const sms = ok(await send("admin/sms/send", { message: "Hello", phones: [phone] }));
      assert.equal(sms.sent, 0);
      assert.match(sms.error, /No SMS gateway/);
      pass("SMS reports clearly when no gateway is configured");
    }
    void productId;
  } finally {
    const orders = await database.collection("orders").find({ "items.slug": slug }).toArray();
    await database.collection("orders").deleteMany({ "items.slug": slug });
    await database.collection("products").deleteMany({ slug });
    await database.collection("stockMovements").deleteMany({ slug });
    await database.collection("suppliers").deleteMany({ name: prefix + " Supplier" });
    await database.collection("purchases").deleteMany({ reference: prefix + "-PO" });
    await database.collection("expenses").deleteMany({ note: prefix });
    await database.collection("landingPages").deleteMany({ slug: prefix + "-offer" });
    await database.collection("pages").deleteMany({ slug: prefix + "-page" });
    await database.collection("coupons").deleteMany({ code: { $regex: "^OPS" }, createdAt: { $gt: new Date(Date.now() - 3600e3) } });
    await database.collection("incompleteOrders").deleteMany({ "items.slug": slug });
    await database.collection("blocklist").deleteMany({ reason: prefix });
    await database.collection("smsLogs").deleteMany({ to: { $regex: phone.slice(1) + "$" } });
    const users = await database.collection("users").find({ email: { $in: [staffEmail, customerEmail] } }).toArray();
    await database.collection("sessions").deleteMany({ userId: { $in: users.map((u) => u._id.toString()) } });
    await database.collection("users").deleteMany({ email: { $in: [staffEmail, customerEmail] } });
    await database.collection("audit").deleteMany({ $or: [{ detail: { $regex: prefix } }, { entityId: { $in: orders.map((o) => String(o._id)) } }] });
    if (savedStore) await database.collection("settings").replaceOne({ key: "store" }, savedStore);
    if (savedIntegrations) await database.collection("settings").replaceOne({ key: "integrations" }, savedIntegrations);
    else await database.collection("settings").deleteOne({ key: "integrations" });
    await mongo.close();
  }
  console.log(`Completed ${checks} operations checks.`);
}
main().catch((error) => {
  console.error("Operations check failed:", error.message);
  process.exitCode = 1;
});
