import "server-only";

import { exploreAll, listings, showcases } from "@/data/catalog";
import type { Brand, Category, ExploreCategory, ListingMeta, Product, Showcase, SubCategory } from "@/types";
import { getProductsBySlugs, orderForListing, selectProducts } from "./products";
import { liveBrands, liveCategories, liveProducts } from "@/server/catalog";

// API (reference frontend): GET /categories?page=&limit=16, GET /products?categorySlug=…,
// GET /products?brandSlug=…, GET /showcase-items?showcaseSlug=…
// Categories and brands are managed in the admin dashboard (MongoDB).

const categoryMap = async () => new Map((await liveCategories()).map((c) => [c.slug, c]));
const brandMap = async () => new Map((await liveBrands()).map((b) => [b.slug, b]));

export async function getCategories(): Promise<Category[]> {
  return liveCategories();
}

export async function getCategory(slug: string): Promise<Category | null> {
  return (await categoryMap()).get(slug) ?? null;
}

/** "Explore all" menu: dashboard categories first, then the remaining snapshot groups. */
export async function getExploreAll(): Promise<ExploreCategory[]> {
  const live = await liveCategories();
  const known = new Set(live.map((c) => c.slug));
  return [
    ...live.map((c) => ({ slug: c.slug, name: c.name, image: c.image, brands: c.brands })),
    ...exploreAll.filter((e) => !known.has(e.slug)),
  ];
}

export async function getSubCategory(categorySlug: string, subSlug: string): Promise<SubCategory | null> {
  return (await categoryMap()).get(categorySlug)?.subCategories.find((s) => s.slug === subSlug) ?? null;
}

export async function getBrands(): Promise<Brand[]> {
  return liveBrands();
}

export async function getBrand(slug: string): Promise<Brand | null> {
  return (await brandMap()).get(slug) ?? null;
}

export async function getBrandsBySlugs(slugs: string[]): Promise<Brand[]> {
  const bySlug = await brandMap();
  return slugs.map((s) => bySlug.get(s)).filter((b): b is Brand => Boolean(b));
}

export interface ListingData {
  products: Product[];
  /** count reported by the live site at snapshot time (the mock holds a subset) */
  reportedTotal: number;
  brands: Brand[];
  attributes: ListingMeta["attributes"];
  price: { min: number; max: number };
  descriptionHtml: string;
}

function priceBounds(list: Product[], meta?: ListingMeta | null) {
  const prices = list.map((p) => p.price).filter((n) => n > 0);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = Math.max(meta?.price?.max ?? 0, prices.length ? Math.max(...prices) : 0);
  return { min, max };
}

export async function getCategoryListing(slug: string): Promise<ListingData | null> {
  const category = (await categoryMap()).get(slug);
  if (!category) return null;
  const meta = listings.categories[slug];
  const list = orderForListing(await selectProducts({ category: slug }), meta?.productSlugs);
  const brandSlugs = meta?.brandSlugs?.length ? meta.brandSlugs : category.brands;
  const brandBySlug = await brandMap();
  return {
    products: list,
    reportedTotal: list.length,
    brands: brandSlugs.map((s) => brandBySlug.get(s)).filter((b): b is Brand => Boolean(b)),
    attributes: meta?.attributes ?? [],
    price: priceBounds(list, meta),
    descriptionHtml: meta?.descriptionHtml ?? "",
  };
}

export async function getSubCategoryListing(categorySlug: string, subSlug: string) {
  const category = (await categoryMap()).get(categorySlug);
  const sub = category?.subCategories.find((s) => s.slug === subSlug);
  const meta = listings.subCategories[`${categorySlug}/${subSlug}`];
  if (!category || (!sub && !meta)) return null;
  const subRef = sub ?? { slug: subSlug, name: meta.title };
  const list = orderForListing(await selectProducts({ category: categorySlug, subCategory: subRef }), meta?.productSlugs);
  const brandSlugs = meta?.brandSlugs?.length ? meta.brandSlugs : [...new Set(list.map((p) => p.brandSlug).filter(Boolean))] as string[];
  const brandBySlug = await brandMap();
  return {
    category,
    subCategory: subRef,
    banners: meta?.banners ?? [],
    listing: {
      products: list,
      reportedTotal: list.length,
      brands: brandSlugs.map((s) => brandBySlug.get(s)).filter((b): b is Brand => Boolean(b)),
      attributes: meta?.attributes ?? [],
      price: priceBounds(list, meta),
      descriptionHtml: meta?.descriptionHtml ?? "",
    } satisfies ListingData,
  };
}

export async function getBrandListing(slug: string) {
  const brand = (await brandMap()).get(slug);
  if (!brand) return null;
  const meta = listings.brands[slug];
  const list = orderForListing(await selectProducts({ brand: slug }), meta?.productSlugs);
  // The snapshot's brand page lists fine-grained sub-categories; the mock filters on the
  // top-level categories that actually occur in this brand's products.
  const categoryChips = (await liveCategories())
    .filter((c) => list.some((p) => p.categorySlugs.includes(c.slug)))
    .map((c) => ({ slug: c.slug, name: c.name, image: c.image }));
  return {
    brand,
    categories: categoryChips,
    listing: {
      products: list,
      reportedTotal: list.length,
      brands: [brand],
      attributes: meta?.attributes ?? [],
      price: priceBounds(list, meta),
      descriptionHtml: meta?.descriptionHtml ?? "",
    } satisfies ListingData,
  };
}

/** Third-level listing: products tagged with the child category in the dashboard. */
export async function getChildCategoryListing(categorySlug: string, subSlug: string, childSlug: string) {
  const category = (await categoryMap()).get(categorySlug);
  const sub = category?.subCategories.find((s) => s.slug === subSlug);
  const child = sub?.children?.find((c) => c.slug === childSlug);
  if (!category || !sub || !child) return null;
  const list = orderForListing((await liveProducts()).filter((p) => p.categorySlugs.includes(categorySlug) && p.childCategorySlugs?.includes(childSlug)));
  const brandBySlug = await brandMap();
  const brandSlugs = [...new Set(list.map((p) => p.brandSlug).filter(Boolean))] as string[];
  return {
    category,
    subCategory: sub,
    child,
    listing: {
      products: list,
      reportedTotal: list.length,
      brands: brandSlugs.map((s) => brandBySlug.get(s)).filter((b): b is Brand => Boolean(b)),
      attributes: [],
      price: priceBounds(list, null),
      descriptionHtml: "",
    } satisfies ListingData,
  };
}

/** Every category / sub-category pair the menus link to (for static generation). */
export async function getSubCategoryParams() {
  const pairs = new Set<string>();
  for (const c of await liveCategories()) for (const s of c.subCategories) pairs.add(`${c.slug}/${s.slug}`);
  for (const key of Object.keys(listings.subCategories)) pairs.add(key);
  return [...pairs].map((k) => {
    const [slug, sub] = k.split("/");
    return { slug, sub };
  });
}

export async function getShowcase(slug: string): Promise<(Showcase & { products: Product[] }) | null> {
  const s = showcases[slug];
  if (!s) return null;
  return { ...s, products: await getProductsBySlugs(s.productSlugs) };
}

/** Online-exclusive products aren't in the snapshot (client-rendered); mock: best discounts. */
export async function getOnlineExclusive(limit = 20): Promise<Product[]> {
  return (await liveProducts())
    .filter((p) => p.inStock && p.price > 0 && p.discount >= 15)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, limit);
}

export async function getPreOrderProducts(limit = 20): Promise<Product[]> {
  const list = (await liveProducts()).filter((p) => p.allowPreOrder || p.isTba || /pre.?order|coming soon/i.test(p.recognitionBadge));
  return list.slice(0, limit);
}
