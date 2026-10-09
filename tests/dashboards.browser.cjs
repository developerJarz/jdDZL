const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { MongoClient, ObjectId } = require("mongodb");
const { readFileSync, mkdirSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
require("@next/env").loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const accounts = JSON.parse(readFileSync(".dashboard-test-credentials.json", "utf8"));
const prefix = `dashboard-browser-${Date.now()}`;
let checks = 0;
const pass = message => { checks++; console.log("PASS", message); };
async function api(context, path, body) {
  // Production uses Secure cookies. Playwright's request client needs an explicit cookie
  // header for loopback HTTP; Chromium itself treats loopback as a trustworthy origin.
  const cookie = (await context.cookies()).map(item => `${item.name}=${item.value}`).join("; ");
  const response = await context.request.fetch(`${base}/api/commerce/${path}`, { method: body ? "POST" : "GET", headers: { origin: base, cookie }, ...(body ? { data: body } : {}) });
  const result = await response.json(); assert.ok(response.ok(), `${path}: ${result.message || response.status()}`); return result;
}
async function signIn(page, role, password = accounts[role].password) {
  await page.goto(base + accounts[role].path);
  await page.getByLabel(role === "customer" ? "Username (Email / Mobile)" : "Email address", { exact: true }).fill(accounts[role].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: role === "customer" ? "LOG IN" : "Sign in to dashboard", exact: true }).click();
  await page.waitForURL(role === "customer" ? "**/account" : "**/admin/workspace");
}
async function main() {
  if (!/^dazzle_dashboard_test_\d+$/.test(process.env.MONGODB_DB || "")) throw new Error("Use the isolated dashboard database.");
  mkdirSync("test-results/dashboard", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const customerContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const customerPage = await customerContext.newPage(), staffPage = await staffContext.newPage();
  const errors = [];
  for (const page of [customerPage, staffPage]) page.on("pageerror", error => errors.push(error.message));
  const client = new MongoClient(process.env.MONGODB_URI); await client.connect(); const db = client.db(process.env.MONGODB_DB);
  const staff = await db.collection("users").findOne({ email: accounts.staff.email });
  const customer = await db.collection("users").findOne({ email: accounts.customer.email });
  const productId = new ObjectId();
  const photo = await db.collection("products").findOne({ image: { $ne: null }, active: true }, { projection: { image: 1 } });
  await db.collection("products").insertOne({ _id: productId, id: productId.toString(), name: "Dashboard Browser Phone", slug: prefix, code: prefix, price: 1500, regularPrice: 1800, costPrice: 900, stock: 10, inStock: true, active: true, isTba: false, endOfLife: false, categorySlugs: ["phone"], subCategorySlugs: [], images: [], image: photo?.image || null, hasDetail: true, createdAt: new Date(), updatedAt: new Date() });
  try {
    await signIn(customerPage, "customer"); await customerPage.getByRole("heading", { name: "Hello, Demo." }).waitFor(); pass("Customer demo credentials sign in to the dashboard");
    const input = { customer: { name: customer.name, email: customer.email, phone: customer.phone, address: "House 10, Road 2, Dhaka", city: "Dhaka" }, items: [{ slug: prefix, qty: 1 }], coupon: "", delivery: "delivery", note: "Dashboard test", paymentMethod: "cod", idempotencyKey: randomUUID() };
    const first = (await api(customerContext, "orders", input)).order;
    const second = (await api(customerContext, "orders", { ...input, idempotencyKey: randomUUID() })).order;
    await db.collection("orders").updateOne({ orderNo: first.orderNo }, { $set: { assignedTo: { id: staff._id.toString(), name: staff.name } } });
    await api(customerContext, "account/wishlist", { slug: prefix, saved: true });
    await customerPage.getByRole("button", { name: "Refresh account" }).click();
    await customerPage.getByText(first.orderNo, { exact: true }).waitFor();
    await customerPage.screenshot({ path: "test-results/dashboard/customer-overview.png", fullPage: true });
    await customerPage.getByRole("button", { name: "Orders", exact: true }).click();
    await customerPage.waitForURL("**/account?tab=orders");
    await customerPage.reload(); await customerPage.getByRole("heading", { name: "Orders", exact: true }).waitFor(); pass("Customer tabs survive refresh and support direct links");
    await customerPage.getByRole("textbox", { name: "Find an order" }).fill(second.orderNo);
    const secondCard = customerPage.locator(".account-card").filter({ hasText: second.orderNo });
    await secondCard.getByRole("button", { name: "Cancel order", exact: true }).waitFor();
    customerPage.once("dialog", dialog => dialog.accept()); await secondCard.getByRole("button", { name: "Cancel order", exact: true }).click();
    await customerPage.getByText("Order cancelled.", { exact: true }).waitFor();
    assert.equal((await db.collection("products").findOne({ _id: productId })).stock, 9); pass("Customer order search and cancellation update real stock");
    await customerPage.getByRole("textbox", { name: "Find an order" }).fill("");
    await customerPage.getByLabel("Order status", { exact: true }).selectOption("cancelled");
    assert.equal(await customerPage.locator(".account-main .account-card").count(), 1); pass("Customer order status filter shows the correct results");
    await customerPage.getByRole("button", { name: "Wishlist", exact: true }).click();
    await customerPage.getByRole("link", { name: "Dashboard Browser Phone", exact: true }).waitFor();
    await customerPage.locator(".account-main").getByRole("button", { name: "Remove", exact: true }).click();
    await customerPage.getByText("Removed from wishlist.", { exact: true }).waitFor();
    assert.equal((await db.collection("users").findOne({ _id: customer._id })).wishlist.includes(prefix), false); pass("Wishlist removal persists across devices");
    await customerPage.getByRole("button", { name: "Addresses", exact: true }).click();
    for (const [label, address] of [["Home", "House 12, Road 2, Dhaka"], ["Work", "Office 5, Road 10, Dhaka"]]) {
      await customerPage.getByRole("button", { name: "Add address", exact: true }).click();
      await customerPage.locator("input[name='label']").fill(label);
      await customerPage.getByLabel("Full address", { exact: true }).fill(address);
      await customerPage.getByRole("button", { name: "Save address", exact: true }).click();
      await customerPage.getByText("Address saved.", { exact: true }).waitFor();
    }
    await customerPage.getByRole("button", { name: "Set as default", exact: true }).click();
    await customerPage.getByText("Default address updated.", { exact: true }).waitFor();
    const addresses = (await db.collection("users").findOne({ _id: customer._id })).addresses;
    assert.equal(addresses.filter(a => a.default).length, 1); assert.equal(addresses.find(a => a.default).label, "Work"); pass("Customer can save addresses and switch the default");
    const workCard = customerPage.locator(".account-main article").filter({ hasText: "Work" });
    await workCard.getByRole("button", { name: "Edit", exact: true }).click();
    await customerPage.getByLabel("Full address").fill("Office 8, Road 10, Dhaka");
    await customerPage.getByRole("button", { name: "Save address", exact: true }).click(); await customerPage.getByText("Address saved.", { exact: true }).waitFor();
    customerPage.once("dialog", dialog => dialog.accept());
    await customerPage.locator(".account-main article").filter({ hasText: "Home" }).getByRole("button", { name: "Remove", exact: true }).click();
    await customerPage.getByText("Address removed.", { exact: true }).waitFor();
    assert.equal((await db.collection("users").findOne({ _id: customer._id })).addresses.length, 1); pass("Customer address editing and removal persist");
    await customerPage.setViewportSize({ width: 390, height: 844 });
    await customerPage.getByRole("button", { name: "Overview", exact: true }).click();
    await customerPage.getByRole("heading", { name: "Overview", exact: true }).waitFor();
    assert.ok(await customerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await customerPage.getByRole("button", { name: "Sign out", exact: true }).isVisible(), true);
    await customerPage.screenshot({ path: "test-results/dashboard/customer-mobile.png", fullPage: true }); pass("Customer mobile layout fits the screen and exposes sign out");

    await signIn(staffPage, "staff"); await staffPage.getByRole("heading", { name: "Welcome back, Demo." }).waitFor();
    await staffPage.getByText(first.orderNo, { exact: true }).waitFor();
    assert.equal(await staffPage.getByRole("link", { name: "Settings", exact: true }).count(), 0);
    assert.equal(await staffPage.getByRole("link", { name: "Staff accounts", exact: true }).count(), 0);
    await staffPage.screenshot({ path: "test-results/dashboard/staff-workspace.png", fullPage: true }); pass("Staff signs in to permitted work queues and assigned orders");
    await staffPage.getByRole("navigation", { name: "Administration" }).getByRole("link", { name: "Overview", exact: true }).click();
    await staffPage.getByText("Revenue collected", { exact: true }).first().waitFor(); assert.ok(staffPage.url().endsWith("/admin/overview")); pass("Staff overview navigation opens the correct page");
    const requests = new Set(), badResponses = [];
    staffPage.on("response", response => {
      if (response.url().includes("/api/commerce/admin/")) { requests.add(response.url()); if (response.status() >= 400) badResponses.push(`${response.status()} ${new URL(response.url()).pathname}`); }
    });
    for (const route of ["orders", "products", "categories", "brands", "attributes", "inventory", "stock-ledger", "pos", "incomplete", "customers", "coupons", "suppliers", "purchases", "expenses", "reports", "tickets", "reviews", "messages", "subscribers", "homepage", "landing", "pages", "blog", "media", "sms", "blocklist"]) {
      const before = requests.size;
      const fetched = staffPage.waitForResponse(response => response.url().includes("/api/commerce/admin/") && !/\/(badges|taxonomy)(\?|$)/.test(response.url()), { timeout: 15000 });
      await staffPage.goto(`${base}/admin/${route}`);
      await (route === "pos" ? staffPage.getByLabel("Scan barcode", { exact: true }) : staffPage.locator("#admin-main h1")).waitFor();
      // Await the page's data fetch, then assert that no error/retry panel was rendered.
      await fetched;
      await staffPage.waitForFunction(() => !document.querySelector("[role='alert']"));
      assert.ok(requests.size > before || route === "orders");
      assert.equal(await staffPage.getByText("You don't have access to this area", { exact: true }).count(), 0, route);
      pass(`Staff ${route} page loads with working API data`);
    }
    assert.deepEqual(badResponses, []); pass("Permitted staff pages make no forbidden or failed API requests");
    await staffPage.goto(`${base}/admin/orders?q=${first.orderNo}`);
    await staffPage.getByRole("button", { name: "Confirm order", exact: true }).click();
    await staffPage.getByRole("button", { name: "Start processing", exact: true }).waitFor();
    assert.equal((await db.collection("orders").findOne({ orderNo: first.orderNo })).status, "confirmed");
    await customerPage.getByRole("button", { name: "Refresh account" }).click();
    const firstCard = customerPage.locator(".account-card").filter({ hasText: first.orderNo });
    await firstCard.locator(".account-badge.confirmed").waitFor(); pass("Staff order confirmation appears in the customer dashboard after refresh");
    await staffPage.goto(`${base}/admin/inventory`); await staffPage.getByLabel("Search name or SKU…").fill(prefix); await staffPage.getByRole("button", { name: "Adjust", exact: true }).click();
    await staffPage.getByLabel("Quantity change").fill("2"); await staffPage.getByLabel("Reason", { exact: true }).fill("Browser verified stock count");
    await staffPage.getByRole("button", { name: "Record adjustment", exact: true }).click();
    await staffPage.getByRole("button", { name: "Record adjustment", exact: true }).waitFor({ state: "hidden" });
    assert.equal((await db.collection("products").findOne({ _id: productId })).stock, 11); pass("Staff inventory adjustment persists with a real stock movement");
    await staffPage.goto(`${base}/admin/profile`); await staffPage.getByLabel("Full name", { exact: true }).fill("Demo Staff Browser Verified");
    await staffPage.getByRole("button", { name: "Save profile", exact: true }).click();
    await staffPage.getByText("Profile updated.", { exact: true }).waitFor();
    assert.equal((await db.collection("users").findOne({ _id: staff._id })).name, "Demo Staff Browser Verified"); pass("Staff own profile saves without owner permissions");
    const secondSession = await browser.newContext(); await api(secondSession, "auth/login", { username: accounts.staff.email, password: accounts.staff.password });
    assert.ok((await api(secondSession, "auth/me")).user, "The second session must be active before the password change");
    const changedPassword = "Verified-browser-pass-123!";
    await staffPage.getByLabel("Current password", { exact: true }).fill(accounts.staff.password);
    await staffPage.getByLabel("New password", { exact: true }).fill(changedPassword);
    await staffPage.getByLabel("Confirm new password", { exact: true }).fill(changedPassword);
    await staffPage.getByRole("button", { name: "Update password", exact: true }).click();
    await staffPage.getByText("Password changed. Other sessions were signed out.", { exact: true }).waitFor();
    assert.equal((await api(secondSession, "auth/me")).user, null); await secondSession.close(); pass("Staff password change works and revokes other sessions");
    await staffPage.goto(`${base}/admin/settings`); await staffPage.getByText("You don't have access to this area", { exact: true }).waitFor(); pass("Owner settings remain inaccessible through a direct staff URL");
    await staffPage.goto(`${base}/admin/workspace`); await staffPage.setViewportSize({ width: 390, height: 844 });
    await staffPage.getByRole("heading", { name: "Welcome back, Demo." }).waitFor();
    await staffPage.waitForFunction(() => !document.body.innerText.includes("Loading your work queues"));
    assert.ok(await staffPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await staffPage.screenshot({ path: "test-results/dashboard/staff-mobile.png", fullPage: true });
    await staffPage.getByRole("button", { name: "Open navigation", exact: true }).click();
    await staffPage.getByRole("link", { name: "Inventory", exact: true }).click(); await staffPage.getByRole("heading", { name: "Inventory", exact: true }).waitFor(); pass("Staff mobile layout and drawer navigation work");
    await staffPage.getByRole("button", { name: "Toggle dark mode", exact: true }).click();
    assert.equal(await staffPage.locator("html").evaluate(element => element.classList.contains("dark")), true); pass("Staff dark mode toggles correctly");
    await staffPage.goto(`${base}/admin/profile`); await staffPage.getByRole("button", { name: "Sign out", exact: true }).click(); await staffPage.waitForURL("**/admin/login");
    await signIn(staffPage, "staff", changedPassword); pass("Staff can sign out and sign in with the changed password");
    await customerPage.getByRole("button", { name: "Profile & security", exact: true }).click();
    await customerPage.getByLabel("Current password", { exact: true }).fill(accounts.customer.password);
    await customerPage.getByLabel("New password", { exact: true }).fill(changedPassword);
    await customerPage.getByLabel("Confirm new password", { exact: true }).fill(changedPassword);
    await customerPage.getByRole("button", { name: "Update password", exact: true }).click();
    await customerPage.getByText("Password changed. Other sessions are now signed out.", { exact: true }).waitFor(); pass("Customer password changes work through the dashboard");
    await customerPage.getByRole("button", { name: "Sign out", exact: true }).click(); await customerPage.waitForURL("**/auth/login"); pass("Customer sign out returns to login");
    await signIn(customerPage, "customer", changedPassword); pass("Customer can sign in with the changed password");
    assert.deepEqual(errors, []); pass("Both dashboards run without uncaught browser errors");
    console.log(`Passed ${checks} dashboard browser checks.`);
  } catch (error) {
    for (const [name, page] of [["customer", customerPage], ["staff", staffPage]]) {
      await page.screenshot({ path: `test-results/dashboard/${name}-failure.png`, fullPage: true });
      console.error(`${name} page: ${page.url()}`);
      console.error((await page.locator("body").innerText()).slice(-2400));
    }
    throw error;
  } finally {
    await db.collection("users").updateOne({ _id: staff._id }, { $set: { name: staff.name, passwordHash: staff.passwordHash } });
    await db.collection("users").updateOne({ _id: customer._id }, { $pull: { wishlist: prefix }, $set: { addresses: customer.addresses || [], passwordHash: customer.passwordHash } });
    await db.collection("orders").deleteMany({ "items.slug": prefix }); await db.collection("products").deleteOne({ _id: productId }); await db.collection("stockMovements").deleteMany({ slug: prefix });
    await client.close(); await customerContext.close(); await staffContext.close(); await browser.close();
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
