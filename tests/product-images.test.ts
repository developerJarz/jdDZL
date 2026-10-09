import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import policy from "../src/data/content/product-image-policy.json" with { type: "json" };
import products from "../src/data/generated/products.json" with { type: "json" };
import { PRODUCT_IMAGE_PLACEHOLDER, resolveImageAsset, sanitizeProductImages } from "../src/lib/product-images.ts";

const require = createRequire(import.meta.url);
const { sanitizeProduct } = require("../scripts/product-image-policy.cjs");
const removed = { src: policy.removedImages[0], width: 100, height: 100 };
const retained = { src: policy.retainedImages[0], width: 100, height: 100 };

test("all retained photos exist and all retired product photos are absent", () => {
  for (const src of policy.retainedImages) assert.ok(fs.existsSync(path.resolve("public", src.slice(1))), src);
  for (const src of policy.removedImages) assert.equal(fs.existsSync(path.resolve("public", src.slice(1))), false, src);
  assert.ok(fs.existsSync(path.resolve("public", PRODUCT_IMAGE_PLACEHOLDER.src.slice(1))));
});

test("each category retains photos for 5–10 sample products", () => {
  for (const category of policy.categories) {
    assert.ok(category.sampleProducts.length >= 5 && category.sampleProducts.length <= 10);
    assert.equal(new Set(category.sampleProducts).size, category.sampleProducts.length);
    for (const slug of category.sampleProducts) {
      const product = products.find(p => p.slug === slug);
      assert.ok(product?.image, slug);
      assert.ok(product.categorySlugs.includes(category.category));
      assert.ok(policy.retainedImages.includes(product.image.src), slug);
    }
  }
});

test("retired photos are blocked in saved records while new uploads remain available", () => {
  assert.equal(resolveImageAsset(removed), null);
  assert.equal(resolveImageAsset({ ...removed, src: removed.src + "?v=1" }), null);
  assert.deepEqual(resolveImageAsset(retained), retained);
  for (const src of ["/api/commerce/media/new-upload", "/images/products/owners-new-photo.webp", "/images/brands/apple.png", "https://example.com/photo.jpg"])
    assert.equal(resolveImageAsset({ ...retained, src })?.src, src);
});

test("gallery cleanup preserves variant indexes and all product fields", () => {
  const product = { slug: "test", price: 100, stock: 8, image: retained, images: [retained, removed, retained], variants: [{ imageIndex: 2 }] };
  const expected = { ...product, images: [retained, PRODUCT_IMAGE_PLACEHOLDER, retained] };
  assert.deepEqual(sanitizeProductImages(product), expected);
  assert.deepEqual(sanitizeProduct(product, new Set(policy.removedImages)), expected);
  assert.deepEqual(product.images[1], removed, "input remains untouched");
  const empty = { ...product, image: removed, images: [removed] };
  assert.deepEqual(sanitizeProductImages(empty), { ...empty, image: null, images: [] });
  assert.deepEqual(sanitizeProduct(empty, new Set(policy.removedImages)), { ...empty, image: null, images: [] });
});
