const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { MongoClient, ObjectId } = require("mongodb");
require("@next/env").loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const prefix = `shop-ui-test-${Date.now()}`, email = `${prefix}@example.com`;
async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0], page = context.pages()[0] || await context.newPage();
  const client = new MongoClient(process.env.MONGODB_URI); await client.connect(); const db = client.db(process.env.MONGODB_DB || "dazzle_store");
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  const productId = new ObjectId();
  await db.collection("products").insertOne({ _id: productId, id: productId.toString(), name: prefix + " Phone", slug: prefix, code: prefix, price: 1500, regularPrice: 1700, stock: 5, inStock: true, active: true, image: null, images: [], brandName: "Apple", brandSlug: "apple", categorySlugs: ["smartphone"], subCategorySlugs: [], hasDetail: true, badge: "", recognitionBadge: "", discount: 12, isTba: false, endOfLife: false, allowPreOrder: false, isBestDeal: false, description: "Browser workflow test phone.", createdAt: new Date(), updatedAt: new Date() });
  try {
    await context.clearCookies(); await page.setViewportSize({ width: 1440, height: 1050 }); await page.goto(base + "/product/" + prefix);
    await page.evaluate(() => localStorage.removeItem("dz-cart")); await page.reload();
    await page.getByRole("button", { name: "Buy Now", exact: true }).first().click();
    await page.waitForURL("**/auth/login?redirect=*");
    await page.getByRole("link", { name: "Sign Up", exact: true }).click();
    await page.getByLabel("Full Name", { exact: true }).fill("Browser Customer");
    await page.getByLabel("Email Address", { exact: true }).fill(email);
    await page.getByLabel("Phone Number", { exact: true }).fill("016" + String(Date.now()).slice(-8));
    await page.getByLabel("Password", { exact: true }).fill("Browser-test-123!"); await page.getByLabel("Confirm Password", { exact: true }).fill("Browser-test-123!");
    await page.getByRole("button", { name: "SIGN UP", exact: true }).click(); await page.waitForURL("**/checkout");
    await page.getByLabel("City", { exact: true }).fill("Dhaka"); await page.getByLabel("Full delivery address", { exact: true }).fill("House 12, Road 5, Dhaka 1207");
    await page.getByLabel("Order note (optional)").fill("Call before arrival");
    await page.getByRole("button", { name: "Place order", exact: true }).click(); await page.getByRole("heading", { name: "Thank you for your order!" }).waitFor({ timeout: 15000 });
    console.log("PASS browser product → signup → checkout → order confirmation");
    await page.goto(base + "/account"); await page.getByRole("heading", { name: "Hello, Browser." }).waitFor();
    await page.screenshot({ path: "account-desktop-preview.png", fullPage: true });
    await page.getByRole("button", { name: "Addresses", exact: false }).click(); await page.getByRole("button", { name: "Add address", exact: true }).click();
    await page.getByLabel("Full address", { exact: true }).fill("House 22, Road 9, Dhaka 1212"); await page.getByRole("button", { name: "Save address", exact: true }).click(); await page.getByText("Address saved.", { exact: true }).waitFor();
    console.log("PASS browser address book creation");
    await page.getByRole("button", { name: "Support & returns", exact: false }).click(); await page.getByLabel("Subject", { exact: true }).fill(prefix + " delivery question"); await page.getByLabel("What happened?", { exact: true }).fill("Please confirm a convenient delivery time."); await page.getByRole("button", { name: "Submit request", exact: true }).click(); await page.getByText("Request received. Follow the conversation here.", { exact: true }).waitFor();
    await page.getByRole("button", { name: /delivery question/ }).click(); await page.getByLabel("Your reply", { exact: true }).fill("Afternoons work best for me."); await page.getByRole("button", { name: "Send reply", exact: true }).click(); await page.getByText("Reply sent.", { exact: true }).waitFor();
    console.log("PASS browser support request and customer reply");
    await page.getByRole("button", { name: /Profile & security/ }).click(); await page.getByLabel("Full name", { exact: true }).fill("Browser Updated"); await page.getByRole("button", { name: "Save profile", exact: true }).click(); await page.getByText("Profile updated.", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole("button", { name: /Overview/ }).click(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Account mobile viewport must not overflow"); await page.screenshot({ path: "account-mobile-preview.png", fullPage: true });
    console.log("PASS mobile dashboard and profile update");
    await page.setViewportSize({ width: 1440, height: 1050 }); await page.goto(base + "/admin/login"); await page.getByLabel("Email address").fill(process.env.ADMIN_EMAIL); await page.getByLabel("Password", { exact: true }).fill(process.env.ADMIN_PASSWORD); await page.getByRole("button", { name: "Sign in to dashboard" }).click(); await page.waitForURL("**/admin");
    for (const [route, heading] of [["tickets", "Support & returns"], ["reviews", "Product reviews"], ["stock-ledger", "Stock movements"]]) { await page.goto(base + "/admin/" + route); await page.getByRole("heading", { level: 1, name: heading, exact: true }).waitFor(); await page.waitForFunction(() => !document.body.textContent.includes("Loading records…")); assert.equal(await page.locator(".admin-error[role=alert]").count(), 0); }
    await page.goto(base + "/admin/tickets"); await page.getByLabel("Search records").fill(prefix); await page.getByRole("button", { name: "Open request", exact: true }).click(); await page.getByLabel("Request status", { exact: true }).selectOption("in-progress"); await page.getByLabel("Reply to customer", { exact: true }).fill("We will arrange an afternoon delivery."); await page.getByRole("button", { name: "Save and send reply", exact: true }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.screenshot({ path: "admin-support-preview.png", fullPage: true });
    const ticket = await db.collection("tickets").findOne({ subject: prefix + " delivery question" }); assert.equal(ticket.status, "in-progress"); assert.equal(ticket.messages.at(-1).author, "store");
    console.log("PASS admin operations and support reply persisted");
    await page.goto(base + "/admin/customers"); await page.getByLabel("Search records").fill(email); await page.getByRole("button", { name: "View customer", exact: true }).click(); await page.getByLabel("Internal customer notes", { exact: true }).fill("Browser verified CRM notes"); await page.getByLabel("Tags (comma separated)").fill("VIP, repeat customer"); await page.getByRole("button", { name: "Save customer notes", exact: true }).click(); await page.getByText("Customer notes saved.", { exact: true }).waitFor();
    console.log("PASS customer CRM view and notes"); assert.deepEqual(errors, []); console.log("PASS no uncaught browser JavaScript errors");
  } finally {
    const users = await db.collection("users").find({ email }).toArray(), ids = users.map(u => u._id.toString());
    const tickets = await db.collection("tickets").find({ userId: { $in: ids } }).toArray();
    await db.collection("audit").deleteMany({ $or: [{ actorId: { $in: ids } }, { entityId: { $in: [...ids, ...tickets.map(t => t._id.toString()), productId.toString()] } }] });
    for (const c of ["sessions", "orders", "tickets", "reviews"]) await db.collection(c).deleteMany({ userId: { $in: ids } });
    await db.collection("users").deleteMany({ email }); await db.collection("products").deleteOne({ _id: productId }); await db.collection("stockMovements").deleteMany({ slug: prefix }); await client.close(); await browser.close();
  }
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
