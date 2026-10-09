import "server-only";

import { productDetails, products } from "@/data/catalog";
import type { Paginated, Product, ProductDetail, ProductQuery } from "@/types";
import { liveProducts } from "@/server/catalog";
import { db } from "@/server/db";
import { isImportedProductField } from "@/server/content-brand";

// API (reference frontend):
//   GET /products?categorySlug=&brandSlug=&page=&limit=
//   GET /get-default-variant/:productId?priceSort=&userDefine=
//   GET /showcase-items?showcaseSlug=

export async function getProduct(slug: string): Promise<Product | null> {
  return (await liveProducts()).find(p => p.slug === slug) ?? null;
}

export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  const snapshot = productDetails[slug] ?? null;
  if (!process.env.MONGODB_URI) return snapshot;
  const product = await (await db()).collection("products").findOne({ slug, active: { $ne: false } });
  if (!product) return null;
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;").replaceAll("\n", "<br />");
  const base: ProductDetail = snapshot || { slug, shortDescriptionHtml: "", descriptionHtml: "", minBookingPrice: 0, purchasePoints: 0, isFreeShipping: false, profitRatio: 0, soldCount: 0, totalReviews: 0, reviewPoints: 0, seo: { title: product.name, description: "", keywords: "" }, variants: [] };
  const descriptionHtml = product.description !== undefined && !isImportedProductField(slug, "description", product.description) ? escape(product.description) : base.descriptionHtml;
  // Specifications entered in the dashboard render as an escaped two-column table.
  const specs = (product.specs ?? []) as { label: string; value: string }[];
  const specsHtml = specs.length
    ? `<h3>Specifications</h3><table><tbody>${specs.map((s) => `<tr><th style="text-align:left;padding:6px 12px 6px 0;width:35%">${escape(s.label)}</th><td style="padding:6px 0">${escape(s.value)}</td></tr>`).join("")}</tbody></table>`
    : "";
  const seo = isImportedProductField(slug, "seo", product.seo) ? undefined : product.seo as Partial<ProductDetail["seo"]> | undefined;
  return {
    ...base,
    descriptionHtml: descriptionHtml + specsHtml,
    ...(product.shortDescription !== undefined && !isImportedProductField(slug, "shortDescription", product.shortDescription) ? { shortDescriptionHtml: escape(product.shortDescription) } : {}),
    ...(product.variants !== undefined ? { variants: product.variants } : {}),
    seo: {
      title: seo?.title || base.seo.title,
      description: seo?.description || base.seo.description,
      keywords: seo?.keywords || base.seo.keywords,
    },
  };
}

/** Products in the order given, skipping unknown slugs. */
export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  const bySlug = new Map((await liveProducts()).map(p => [p.slug, p]));
  return slugs.map(s => bySlug.get(s)).filter((p): p is Product => Boolean(p));
}

export async function getAllProductSlugs(): Promise<string[]> {
  return products.map((p) => p.slug);
}

export async function getDetailedProductSlugs(): Promise<string[]> {
  return products.filter((p) => p.hasDetail).map((p) => p.slug);
}

export async function getProductsByBrand(brandSlug: string, limit = 12): Promise<Product[]> {
  return (await liveProducts()).filter((p) => p.brandSlug === brandSlug && p.price > 0).slice(0, limit);
}

export async function getRelatedProducts(product: Product, limit = 10): Promise<Product[]> {
  const cat = product.categorySlugs[0];
  const pool = (await liveProducts()).filter((p) => p.slug !== product.slug && p.price > 0 && cat && p.categorySlugs.includes(cat));
  const sameBrand = pool.filter((p) => p.brandSlug === product.brandSlug);
  const others = pool.filter((p) => p.brandSlug !== product.brandSlug);
  return [...sameBrand, ...others].slice(0, limit);
}

/**
 * Every product matching the structural part of a query (category / sub-category / brand /
 * search). Sub-categories in the reference menu are mostly brand or product-line names
 * ("iPhone", "Vivo", "Apple MacBook"), so the mock also matches on brand and title words.
 */
export async function selectProducts(
  q: Pick<ProductQuery, "category" | "brand" | "search"> & { subCategory?: { slug: string; name: string } },
): Promise<Product[]> {
  const needle = q.search?.trim().toLowerCase();
  const sub = q.subCategory;
  const subWords = sub ? sub.name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1) : [];
  return (await liveProducts()).filter((p) => {
    if (q.category && !p.categorySlugs.includes(q.category)) return false;
    if (sub && !p.subCategorySlugs.includes(sub.slug)) {
      const name = p.name.toLowerCase();
      const byBrand = p.brandSlug === sub.slug || (p.brandName ?? "").toLowerCase() === sub.name.toLowerCase();
      const byTitle = subWords.length > 0 && subWords.every((w) => name.includes(w));
      if (!byBrand && !byTitle) return false;
    }
    if (q.brand && p.brandSlug !== q.brand) return false;
    if (needle && !p.name.toLowerCase().includes(needle) && !(p.brandName ?? "").toLowerCase().includes(needle)) return false;
    return true;
  });
}

/**
 * Listing order used across category/brand pages: the snapshot's own first page first, then
 * the rest of the mock catalogue (available items before upcoming / out-of-stock ones).
 */
export function orderForListing(list: Product[], leading: string[] = []): Product[] {
  const lead = leading.map((s) => list.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p));
  const leadSet = new Set(lead.map((p) => p.slug));
  const rest = list
    .filter((p) => !leadSet.has(p.slug))
    .sort((a, b) => Number(b.inStock && b.price > 0) - Number(a.inStock && a.price > 0));
  return [...lead, ...rest];
}

export function paginate<T>(items: T[], page = 1, pageSize = 12): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    total: items.length,
    page: current,
    pageSize,
    totalPages,
  };
}
