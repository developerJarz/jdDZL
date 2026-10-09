import test from "node:test";
import assert from "node:assert/strict";
import { apiPermissions, canAccessSection } from "../src/lib/permissions.ts";

test("every staff role has a workspace and personal profile without owner privileges", () => {
  const cashier = { role: "staff", permissions: ["orders", "pos"] };
  assert.equal(canAccessSection(cashier, "workspace"), true);
  assert.equal(canAccessSection(cashier, "profile"), true);
  assert.equal(canAccessSection(cashier, "orders"), true);
  for (const section of ["settings", "staff", "reports", "products", "unknown"])
    assert.equal(canAccessSection(cashier, section), false, section);
  for (const section of ["workspace", "profile", "orders"])
    assert.equal(canAccessSection({ role: "customer" }, section), false);
  assert.equal(apiPermissions(["workspace"], "GET"), "any-staff");
  assert.equal(canAccessSection({ role: "admin" }, "settings"), true);
  assert.equal(canAccessSection({ role: "admin" }, "unknown"), false);
});
