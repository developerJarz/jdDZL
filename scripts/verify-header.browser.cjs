// Regression check for menu clipping, pointer handoff, keyboard access and responsive behavior.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const origin =
  process.env.TEST_BASE_URL ||
  process.argv.find((arg) => arg.startsWith("--origin="))?.slice(9) ||
  "http://127.0.0.1:3100";
const output = "test-results/header";

async function opened(panel) {
  await panel.waitFor({ state: "visible" });
  await panel.page().waitForFunction(
    (id) => {
      const node = document.getElementById(id);
      return (
        node?.dataset.open === "true" && getComputedStyle(node).opacity === "1"
      );
    },
    await panel.getAttribute("id"),
  );
}

async function withinViewport(page, panel, label) {
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && box.width > 0 && box.height > 0, label + " is usable");
  assert.ok(
    box.x >= 8 && box.x + box.width <= viewport.width - 8,
    label + " fits horizontally",
  );
  assert.ok(
    box.y >= 0 && box.y + box.height <= viewport.height - 8,
    label + " fits vertically",
  );
  assert.equal(
    await panel.evaluate((node) => node.scrollWidth > node.clientWidth + 1),
    false,
    label + " content fits",
  );
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("same key"))
        console.error(message.text().slice(0, 300));
    });
    await page.goto(origin, { waitUntil: "networkidle" });
    for (const viewport of process.argv.includes("--mobile-only")
      ? []
      : [
          { width: 1024, height: 640 },
          { width: 1280, height: 720 },
          { width: 1440, height: 900 },
          { width: 1920, height: 1080 },
        ]) {
      await page.setViewportSize(viewport);
      const panel = page.locator("#desktop-category-panel");
      const categories = page.getByRole("navigation", {
        name: "Categories",
        exact: true,
      });
      const links = categories.locator("a");
      assert.equal(await links.count(), 10, "all desktop categories available");
      for (let index = 0; index < (await links.count()); index++) {
        const link = links.nth(index);
        await link.hover();
        await opened(panel);
        const name = await link.innerText();
        await withinViewport(page, panel, `${viewport.width}: ${name}`);
        await panel
          .getByRole("link", { name: `View all ${name}`, exact: true })
          .hover();
        assert.equal(
          await panel.getAttribute("data-open"),
          "true",
          "pointer crosses gap into panel",
        );
      }
      if (viewport.width === 1440)
        await page.screenshot({ path: `${output}/desktop-right-category.png` });
      await page.keyboard.press("Escape");
      await panel.waitFor({ state: "hidden" });

      const explore = page.getByRole("button", {
        name: "Explore all",
        exact: true,
      });
      await explore.focus();
      await explore.press("Enter");
      await opened(panel);
      await withinViewport(page, panel, `${viewport.width}: explore`);
      const exploreCategories = panel
        .getByRole("navigation", { name: "Explore categories" })
        .getByRole("button");
      for (let index = 0; index < (await exploreCategories.count()); index++) {
        await exploreCategories.nth(index).focus();
        await withinViewport(
          page,
          panel,
          `${viewport.width}: explore category ${index}`,
        );
      }
      if (viewport.width === 1440) {
        await exploreCategories.first().focus();
        await page.screenshot({ path: `${output}/explore.png` });
      }
      await page.keyboard.press("Escape");
      assert.equal(
        await explore.evaluate((node) => node === document.activeElement),
        true,
        "Escape returns focus to trigger",
      );

      const keyboardTrigger = categories.getByRole("button").last();
      await keyboardTrigger.focus();
      await keyboardTrigger.press("ArrowDown");
      await opened(panel);
      assert.equal(
        await panel.evaluate((node) => node.contains(document.activeElement)),
        true,
        "ArrowDown focuses dropdown links",
      );
      await page.keyboard.press("Escape");
      await keyboardTrigger.press("Enter");
      await opened(panel);
      await page.mouse.click(2, viewport.height - 20);
      await panel.waitFor({ state: "hidden" });
      console.log(
        `PASS desktop ${viewport.width}: every category, explore, keyboard and outside click`,
      );
    }

    for (const viewport of [
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 900, height: 600 },
    ]) {
      await page.setViewportSize(viewport);
      const panel = page.locator("#mobile-category-panel");
      const trigger = page.getByRole("button", {
        name: "Open menu",
        exact: true,
      });
      await trigger.click();
      await opened(panel);
      await withinViewport(page, panel, `${viewport.width}: mobile menu`);
      const expand = panel.getByRole("button", { name: /^Expand/ }).first();
      const submenuId = await expand.getAttribute("aria-controls");
      await expand.click();
      const submenu = page.locator("#" + submenuId);
      await submenu.waitFor({ state: "visible" });
      await withinViewport(page, panel, `${viewport.width}: expanded menu`);
      assert.equal(
        await submenu.getAttribute("inert"),
        null,
        "expanded links are interactive",
      );
      if (viewport.width === 390)
        await page.screenshot({ path: `${output}/mobile.png` });
      await panel.locator(`button[aria-controls="${submenuId}"]`).click();
      await submenu.waitFor({ state: "hidden" });
      assert.equal(
        await submenu.getAttribute("inert"),
        "",
        "collapsed links leave the tab order",
      );
      await page.keyboard.press("Escape");
      await panel.waitFor({ state: "hidden" });
      assert.notEqual(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
        "body scrolling restored",
      );
      assert.equal(
        await panel.getAttribute("inert"),
        "",
        "closed dropdown is removed from tab order",
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      if (overflow)
        console.log(
          await page.evaluate(() => ({
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            elements: [...document.querySelectorAll("body *")]
              .filter((node) => {
                if (node.getBoundingClientRect().right <= innerWidth + 1)
                  return false;
                let parent = node.parentElement;
                while (parent && parent.tagName !== "BODY") {
                  if (
                    ["hidden", "clip", "auto", "scroll"].includes(
                      getComputedStyle(parent).overflowX,
                    )
                  )
                    return false;
                  parent = parent.parentElement;
                }
                return true;
              })
              .slice(0, 10)
              .map((node) => ({
                tag: node.tagName,
                class: node.getAttribute("class"),
                text: node.textContent.slice(0, 40),
                width: node.getBoundingClientRect().width,
              })),
          })),
        );
      assert.equal(overflow, false, "no horizontal page overflow");
      console.log(
        `PASS mobile/tablet ${viewport.width}: open, expand, bounds and dismissal`,
      );
    }

    // Resizing a touch menu into the desktop layout must restore page scrolling.
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.body.style.overflow !== "hidden");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const trigger = page.getByRole("button", {
      name: "Explore all",
      exact: true,
    });
    await trigger.focus();
    await trigger.press("Enter");
    const panel = page.locator("#desktop-category-panel");
    await opened(panel);
    assert.equal(
      await panel.evaluate((node) => getComputedStyle(node).transitionDuration),
      "0s",
      "reduced motion respected",
    );
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({ path: `${output}/dark.png` });
    assert.deepEqual(errors, [], "no browser runtime errors");

    const touchPage = await browser.newPage({
      viewport: { width: 1024, height: 768 },
      hasTouch: true,
    });
    await touchPage.goto(origin, { waitUntil: "networkidle" });
    await touchPage
      .getByRole("navigation", { name: "Categories", exact: true })
      .getByRole("button")
      .last()
      .tap();
    await opened(touchPage.locator("#desktop-category-panel"));
    console.log(
      "PASS touch activation, breakpoint change, dark mode and reduced motion",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
