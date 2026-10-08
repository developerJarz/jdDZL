import test from "node:test";
import assert from "node:assert/strict";
import { discountFor, transitions } from "../src/server/pricing.ts";
import {
  checkoutSchema,
  couponSchema,
  productSchema,
} from "../src/server/schemas.ts";
const expiry = new Date("2030-01-01");
test("discounts are capped at the subtotal and percentages round to whole taka", () => {
  assert.equal(
    discountFor(999, {
      type: "percent",
      value: 10,
      minOrder: 0,
      active: true,
      expiresAt: expiry,
    }),
    100,
  );
  assert.equal(
    discountFor(100, {
      type: "fixed",
      value: 200,
      minOrder: 0,
      active: true,
      expiresAt: expiry,
    }),
    100,
  );
});
test("inactive, expired, and below-minimum coupons are rejected", () => {
  assert.throws(() =>
    discountFor(100, {
      type: "percent",
      value: 10,
      minOrder: 500,
      active: true,
      expiresAt: expiry,
    }),
  );
  assert.throws(() =>
    discountFor(100, {
      type: "fixed",
      value: 10,
      minOrder: 0,
      active: false,
      expiresAt: expiry,
    }),
  );
  assert.throws(() =>
    discountFor(100, {
      type: "fixed",
      value: 10,
      minOrder: 0,
      active: true,
      expiresAt: new Date("2000-01-01"),
    }),
  );
});
test("terminal order states cannot be reopened and shipped orders cannot restore stock through cancellation", () => {
  assert.deepEqual(transitions.cancelled, []);
  assert.deepEqual(transitions.delivered, []);
  assert.deepEqual(transitions.shipped, ["delivered"]);
  assert.ok(transitions.pending.includes("cancelled"));
});
test("product validation rejects negative inventory, invalid slugs, unsafe images, and inverted prices", () => {
  const valid = {
    name: "Phone",
    slug: "phone",
    code: "SKU-1",
    price: 100,
    regularPrice: 120,
    stock: 3,
    brandSlug: null,
    brandName: null,
    categorySlugs: [],
    imageSrc: "",
    active: true,
  };
  assert.ok(productSchema.safeParse(valid).success);
  for (const change of [
    { stock: -1 },
    { stock: 1.5 },
    { price: 130 },
    { imageSrc: "javascript:alert(1)" },
    { imageSrc: "/images/../secret" },
    { slug: "../../admin" },
  ])
    assert.equal(
      productSchema.safeParse({ ...valid, ...change }).success,
      false,
    );
});
test("percentage coupons cannot exceed 100 percent", () => {
  assert.equal(
    couponSchema.safeParse({
      code: "HUGE",
      type: "percent",
      value: 101,
      minOrder: 0,
      expiresAt: expiry.toISOString(),
      active: true,
    }).success,
    false,
  );
});
test("checkout strips client prices and disallows fractional or zero quantities", () => {
  const schema = checkoutSchema.pick({ items: true, coupon: true });
  const result = schema.parse({
    items: [{ slug: "phone", qty: 1, price: -500 }],
    coupon: "",
  });
  assert.equal("price" in result.items[0], false);
  assert.equal(
    schema.safeParse({ items: [{ slug: "phone", qty: 0 }], coupon: "" })
      .success,
    false,
  );
  assert.equal(
    schema.safeParse({ items: [{ slug: "phone", qty: 1.5 }], coupon: "" })
      .success,
    false,
  );
});
