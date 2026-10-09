import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { isRemovedPhotoProduct, stockFields } = require("../scripts/reset-catalogue.cjs");

const oldImage = { src: "/images/products/deleted.jpg" };
const keptImage = { src: "/images/products/kept.jpg" };
const policy = { removedImages: [oldImage.src], homepageProductSlugs: ["homepage-phone"] };

test("only products whose actual photos were retired are deletion candidates", () => {
  assert.equal(isRemovedPhotoProduct({ slug: "deleted", image: oldImage, images: [oldImage] }, policy), true);
  assert.equal(isRemovedPhotoProduct({ slug: "mixed", image: oldImage, images: [keptImage] }, policy), false);
  assert.equal(isRemovedPhotoProduct({ slug: "new-upload", image: { src: "/api/commerce/media/upload" } }, policy), false);
  assert.equal(isRemovedPhotoProduct({ slug: "never-had-photos", image: null, images: [] }, policy), false);
  assert.equal(isRemovedPhotoProduct({ slug: "homepage-phone", image: oldImage }, policy), false);
  assert.equal(isRemovedPhotoProduct({ slug: "with-placeholder", image: oldImage, images: [{ src: "/images/brand/product-unavailable.svg" }] }, policy), true);
});

test("initial stock does not make upcoming or discontinued products available for checkout", () => {
  assert.deepEqual(stockFields({}, 10), { stock: 10, inStock: true });
  assert.deepEqual(stockFields({ isTba: true }, 10), { stock: 10, inStock: false });
  assert.deepEqual(stockFields({ endOfLife: true }, 10), { stock: 10, inStock: false });
});

test("variant stock totals ten per product and preserves variant prices and identifiers", () => {
  for (const count of [1, 3, 12]) {
    const variantStock = Array.from({ length: count }, (_, i) => ({ key: `Option ${i}`, stock: 20, price: 200 + i, sku: `SKU-${i}` }));
    const result = stockFields({ trackVariants: true, variantStock }, 10);
    assert.equal(result.stock, 10);
    assert.equal(result.variantStock.reduce((sum: number, row: { stock: number }) => sum + row.stock, 0), 10);
    for (const [index, row] of result.variantStock.entries()) {
      assert.equal(row.key, variantStock[index].key);
      assert.equal(row.price, variantStock[index].price);
      assert.equal(row.sku, variantStock[index].sku);
    }
    assert.equal(variantStock[0].stock, 20, "original records are not mutated");
  }
});
