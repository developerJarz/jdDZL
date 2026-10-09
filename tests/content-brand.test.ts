import test from "node:test";
import assert from "node:assert/strict";
import manifest from "../src/data/content/import-manifest.json" with { type: "json" };
import { cleanHomeContent, cleanStoreIdentity, contentHash, isImportedPost, isImportedProductField, matchesImportedPost } from "../src/server/content-brand.ts";
import { homeSchema } from "../src/server/schemas.ts";
import home from "../src/data/generated/home.json" with { type: "json" };

test("rebranding removes imported contact destinations without losing the owner's new contacts", () => {
  const imported = cleanStoreIdentity(manifest.site);
  assert.equal(imported.name, "dazzle.bd");
  assert.equal(imported.phone, "");
  assert.equal(imported.email, "");
  assert.equal(imported.address, "");
  assert.deepEqual(imported.social, {});
  const current = { name: "dazzle.bd", phone: "01712345678", email: "owner@example.com", address: "Owner's new address", social: { facebook: "https://facebook.com/owners-new-store" } };
  assert.deepEqual(cleanStoreIdentity(current), current);
});

test("a copied article body is retired even when its title was changed", () => {
  const source = { title: contentHash("Imported title"), contentHtml: contentHash("<p>Imported article body</p>") };
  assert.equal(matchesImportedPost({ title: "Changed title", contentHtml: "<p>Imported article body</p>" }, source), true);
  assert.equal(matchesImportedPost({ title: "Imported title", contentHtml: "<p>A new guide written by the owner</p>" }, source), false);
  assert.equal(isImportedPost({ slug: "owners-own-guide", title: "Guide", contentHtml: "<p>New article</p>" }), false);
});

test("the legacy matcher identifies a title-only imported post and preserves revised copy", () => {
  const title = "Imported title without a body";
  const original = { title: contentHash(title), contentHtml: null };
  assert.equal(matchesImportedPost({ title }, original), true);
  assert.equal(matchesImportedPost({ title: "The owner's revised title" }, original), false);
  assert.equal(matchesImportedPost({ title, contentHtml: "<p>The owner's independently written guide.</p>" }, original), false);
  assert.equal(isImportedPost({ slug: "custom-post", title }), false);
});

test("product fields edited by the owner are not replaced by an imported description", () => {
  const product = manifest.products.find(p => p.description);
  assert.ok(product);
  assert.equal(isImportedProductField(product.slug, "description", "A new product description written in the dashboard"), false);
  assert.equal(isImportedProductField(product.slug, "seo", { title: "Owner title", description: "Owner description" }), false);
  assert.equal(isImportedProductField("custom-product", "description", "Custom text"), false);
});

test("existing home banners use the new copy while owner merchandising edits survive", () => {
  const customProductList = ["owners-custom-product"];
  const stored = { heroSlides: [{ image: { src: "/images/banners/old-promotion.jpg" } }], featuredSlugs: customProductList };
  const current = cleanHomeContent(home, stored);
  assert.deepEqual(current.heroSlides, home.heroSlides);
  assert.deepEqual(current.featuredSlugs, customProductList);
  const ownerBanner = [{ ...home.heroSlides[0], headline: "The owner's original new promotion" }];
  assert.deepEqual(cleanHomeContent(home, { heroSlides: ownerBanner }).heroSlides, ownerBanner);
});

test("saving the homepage keeps the new banner copy and rejects oversized text", () => {
  const document = { ...home, sections: [] };
  const saved = homeSchema.parse(document);
  assert.equal(saved.heroSlides[0].headline, home.heroSlides[0].headline);
  assert.equal(saved.heroSlides[0].text, home.heroSlides[0].text);
  assert.throws(() => homeSchema.parse({ ...document, heroSlides: [{ ...home.heroSlides[0], headline: "x".repeat(161) }] }));
});
