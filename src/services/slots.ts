import "server-only";

import type { Product } from "@/types";

// "Top Selling" / "Trending" rows on listing pages are filled client-side by the reference
// (showcase API). The mock derives them from the merchandising badges in the snapshot.

const available = (p: Product) => p.inStock && p.price > 0;

export function topSellingSlot(list: Product[], limit = 5): Product[] {
  const tagged = list.filter((p) => available(p) && /top selling|customers choice|most popular/i.test(p.badge));
  const rest = list.filter((p) => available(p) && !tagged.includes(p)).sort((a, b) => b.discount - a.discount);
  return [...tagged, ...rest].slice(0, limit);
}

export function trendingSlot(list: Product[], exclude: Product[] = [], limit = 5): Product[] {
  const skip = new Set(exclude.map((p) => p.slug));
  const pool = list.filter((p) => available(p) && !skip.has(p.slug));
  const tagged = pool.filter((p) => /hot product|new arrival|high demand/i.test(p.badge));
  return [...tagged, ...pool.filter((p) => !tagged.includes(p))].slice(0, limit);
}
