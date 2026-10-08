import test from "node:test";
import assert from "node:assert/strict";
import { advanceFor, shippingFor } from "../src/server/pricing.ts";
import { apiPermissions, can } from "../src/lib/permissions.ts";

const base = { subtotal: 5000, freeAbove: 10000, insideFee: 60, outsideFee: 120 };
test("shipping uses zone, city fallback, free rules and pickup", () => {
  assert.equal(shippingFor({ ...base, city: "Dhaka" }), 60);
  assert.equal(shippingFor({ ...base, city: "Chattogram" }), 120);
  assert.equal(shippingFor({ ...base, city: "Chattogram", zone: { fee: 80 } }), 80);
  assert.equal(shippingFor({ ...base, subtotal: 12000, city: "Sylhet" }), 0);
  assert.equal(shippingFor({ ...base, free: true }), 0);
  assert.equal(shippingFor({ ...base, pickup: true }), 0);
});

test("partial payment advance follows the configured rule and never exceeds the total", () => {
  const totals = { total: 1000, shipping: 120 };
  assert.equal(advanceFor(undefined, totals), 0);
  assert.equal(advanceFor({ enabled: true, type: "shipping", value: 0 }, totals), 120);
  assert.equal(advanceFor({ enabled: true, type: "fixed", value: 300 }, totals), 300);
  assert.equal(advanceFor({ enabled: true, type: "percent", value: 25 }, totals), 250);
  assert.equal(advanceFor({ enabled: true, type: "fixed", value: 5000 }, totals), 1000);
});

test("staff permissions gate admin APIs; owners pass everything", () => {
  const cashier = { role: "staff", permissions: ["pos", "orders"] };
  assert.equal(can({ role: "admin" }, "settings"), true);
  assert.equal(can(cashier, "settings"), false);
  assert.equal(can({ role: "customer", permissions: ["orders"] }, "orders"), false);
  assert.deepEqual(apiPermissions(["settings"], "PATCH"), ["settings"]);
  assert.ok((apiPermissions(["products"], "GET") as string[]).includes("pos"));
  assert.deepEqual(apiPermissions(["products"], "PATCH"), ["products"]);
  assert.deepEqual(apiPermissions(["something-new"], "GET"), []);
});
