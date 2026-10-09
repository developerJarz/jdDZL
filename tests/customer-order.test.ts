import test from "node:test";
import assert from "node:assert/strict";
import { customerOrderView } from "../src/lib/customer-order.ts";

test("customer responses exclude costs and staff details without altering admin records", () => {
  const original = { items: [{ name: "Phone", price: 200, cost: 100 }], total: 200, ip: "private", assignedTo: { id: "staff" }, payments: [{ amount: 200, actorId: "staff" }], shipment: { trackingNumber: "TRACK-1" } };
  const visible = customerOrderView(original);
  assert.deepEqual(visible.items, [{ name: "Phone", price: 200 }]);
  assert.deepEqual(visible.payments, [{ amount: 200 }]);
  assert.equal("ip" in visible, false);
  assert.equal("assignedTo" in visible, false);
  assert.equal(visible.total, 200);
  assert.deepEqual(visible.shipment, original.shipment);
  assert.equal(original.items[0].cost, 100);
  assert.equal(original.payments[0].actorId, "staff");
  assert.deepEqual(customerOrderView({ lines: original.items }).lines, [{ name: "Phone", price: 200 }]);
});
