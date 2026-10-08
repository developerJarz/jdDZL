const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { MongoClient } = require("mongodb");
require("@next/env").loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const prefix = "codex-ui-test-" + Date.now();
async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = context.pages()[0] || (await context.newPage());
  await page.setViewportSize({ width: 1440, height: 1050 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const mongo = new MongoClient(process.env.MONGODB_URI);
  await mongo.connect();
  const database = mongo.db(process.env.MONGODB_DB || "dazzle_store");
  try {
    await page.goto(base + "/admin/login");
    await page.screenshot({ path: "admin-login-preview.png", fullPage: true });
    await page.getByLabel("Email address").fill(process.env.ADMIN_EMAIL);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in to dashboard" }).click();
    await page.waitForURL("**/admin");
    await page.getByText("Revenue collected", { exact: true }).waitFor();
    await page.screenshot({
      path: "admin-desktop-preview.png",
      fullPage: true,
    });
    console.log("PASS browser sign-in and desktop overview");
    for (const [route, heading] of [
      ["orders", "Orders"],
      ["products", "Products"],
      ["inventory", "Inventory"],
      ["customers", "Customers"],
      ["coupons", "Coupons"],
      ["messages", "Inbox"],
      ["subscribers", "Subscribers"],
      ["activity", "Activity log"],
      ["settings", "Settings"],
    ]) {
      await page.goto(base + "/admin/" + route);
      await page
        .getByRole("heading", { level: 1, name: heading, exact: true })
        .waitFor();
      await page.waitForFunction(
        () =>
          !document.body.textContent.includes("Loading records…") &&
          !document.body.textContent.includes("Loading store settings…"),
      );
      assert.equal(
        await page.locator(".admin-error[role='alert']").count(),
        0,
        `${route}: ${(await page.locator(".admin-error[role='alert']").allTextContents()).join(" ")}`,
      );
    }
    console.log("PASS all nine management pages load without API errors");
    await page.goto(base + "/admin/products");
    await page
      .getByRole("button", { name: "Add product", exact: true })
      .click();
    await page
      .getByLabel("Product name", { exact: true })
      .fill(prefix + " Phone");
    await page.getByLabel("URL slug").fill(prefix);
    await page.getByLabel("SKU / product code").fill(prefix);
    await page.getByLabel("Sale price (BDT)").fill("1500");
    await page.getByLabel("Regular price (BDT)").fill("1700");
    await page.getByLabel("Available quantity").fill("2");
    await page.getByLabel("Category slugs").fill("smartphone");
    await page
      .getByLabel("Product description")
      .fill("Browser verified product description");
    await page
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    await page
      .getByText("Changes saved successfully.", { exact: true })
      .waitFor();
    await page.getByLabel("Search records").fill(prefix);
    await page.getByText(prefix + " Phone", { exact: true }).waitFor();
    console.log("PASS product creation and searchable persisted record");
    await page.screenshot({
      path: "admin-products-preview.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Edit product", exact: true })
      .click();
    await page.getByLabel("Available quantity").fill("7");
    await page
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    await page.getByText("7 units", { exact: true }).waitFor();
    assert.equal(
      (await database.collection("products").findOne({ slug: prefix })).stock,
      7,
    );
    await page.goto(base + "/product/" + prefix);
    await page
      .getByText("Browser verified product description", { exact: true })
      .waitFor();
    console.log("PASS stock editing and live storefront product description");
    await page.goto(base + "/admin");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText("Revenue collected", { exact: true }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    );
    await page.screenshot({ path: "admin-mobile-preview.png", fullPage: true });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Orders", exact: true }).click();
    await page
      .getByRole("heading", { level: 1, name: "Orders", exact: true })
      .waitFor();
    console.log("PASS mobile layout and navigation");
    assert.deepEqual(errors, []);
    console.log("PASS no browser JavaScript errors");
  } finally {
    const product = await database
      .collection("products")
      .findOne({ slug: prefix });
    if (product) {
      await database
        .collection("audit")
        .deleteMany({ entityId: product._id.toString() });
      await database.collection("products").deleteOne({ _id: product._id });
    }
    await mongo.close();
    await context.close();
    await browser.close();
  }
}
main().catch((error) => {
  console.error("Browser verification failed:", error.message);
  process.exitCode = 1;
});
