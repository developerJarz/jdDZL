// Read-only smoke check of the rendered storefront. Run against a local production server.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const output = "test-results/rebrand";
const forbidden = /dazzle\.com\.bd|dazzlebangladesh|393,000|820,000|99\.7%|offline snapshot/i;

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const routes = ["/", "/about-us", "/blogs", "/blogs/choose-a-phone-for-your-everyday-routine", "/categories/phones", "/faq", "/privacy-policy", "/shop-location", "/pre-order", "/announcement/meet-dazzle-bd", "/product/haylou-s30-anc-headphone"];
    for (const route of routes) {
      const response = await page.goto(origin + route, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, route);
      assert.match(await page.title(), /dazzle\.bd/i, route + " brand in page title");
      const body = await page.locator("body").innerText();
      assert.equal(forbidden.test(body), false, route + " old copy in visible text");
      const links = await page.locator("a[href]").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
      assert.equal(links.some(link => forbidden.test(link) || link === "tel:" || link === "https://wa.me/"), false, route + " old or empty contact links");
      assert.equal(await page.locator('img[alt="dazzle.bd logo"]').first().evaluate(node => node.complete && node.naturalWidth > 0), true, route + " wordmark loads");
      if (route === "/") await page.screenshot({ path: output + "/home-desktop.png", fullPage: false });
      console.log("PASS", route);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, "mobile horizontal overflow");
    await page.screenshot({ path: output + "/home-mobile.png", fullPage: false });
    assert.deepEqual(errors, [], "browser runtime errors");
    console.log("PASS mobile layout and browser runtime");
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
