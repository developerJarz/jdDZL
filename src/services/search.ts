import "server-only";

import type { Brand, Product } from "@/types";
import { liveBrands, liveCategories, liveProducts } from "@/server/catalog";

// API (reference frontend): GET /product/search?keyword=&page=1&perPage=20,
//                           GET /trending/search?page=1&perPage=10

export interface SearchResult {
  query: string;
  total: number;
  products: Product[];
  categories: { slug: string; name: string }[];
  brands: Brand[];
}

function score(p: Product, words: string[]) {
  const name = p.name.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (name.startsWith(w)) s += 3;
    else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) s += 2;
    else if (name.includes(w)) s += 1;
    else if ((p.brandName ?? "").toLowerCase().includes(w)) s += 1;
    else return 0;
  }
  if (p.inStock && p.price > 0) s += 0.5;
  return s;
}

export async function searchCatalog(query: string, limit = 20): Promise<SearchResult> {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { query, total: 0, products: [], categories: [], brands: [] };
  const matches = (await liveProducts())
    .map((p) => ({ p, s: score(p, words) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.p.price - a.p.price)
    .map((x) => x.p);
  const catSlugs = [...new Set(matches.flatMap((p) => p.categorySlugs))];
  const brandSlugs = [...new Set(matches.map((p) => p.brandSlug).filter(Boolean))] as string[];
  const [categories, brands] = await Promise.all([liveCategories(), liveBrands()]);
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
  return {
    query,
    total: matches.length,
    products: matches.slice(0, limit),
    categories: catSlugs.map((s) => categories.find((c) => c.slug === s)).filter(Boolean).map((c) => ({ slug: c!.slug, name: c!.name })),
    brands: brandSlugs.slice(0, 6).map((s) => brandBySlug.get(s)).filter((b): b is Brand => Boolean(b)),
  };
}

/** "Trending searches" shown when the search box is focused but empty. */
export async function getTrendingSearches(limit = 6): Promise<Product[]> {
  return (await liveProducts()).filter((p) => p.badge && p.inStock && p.price > 0).slice(0, limit);
}
