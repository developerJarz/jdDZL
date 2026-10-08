// Client-safe filtering / sorting for listing pages (category, brand, search, showcases).
// With a real API these become query parameters; the mock applies them in the browser.
import type { Product, SortKey } from "@/types";

export interface ListingFilters {
  brand: string | null;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  stock: ("in" | "out")[];
  attributes: Record<string, string[]>;
  sort: SortKey;
}

export const emptyFilters: ListingFilters = { brand: null, category: null, minPrice: null, maxPrice: null, stock: [], attributes: {}, sort: "" };

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: "", label: "Default" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "discount", label: "Biggest Discount" },
];

const haystackCache = new WeakMap<Product, string>();
function haystack(p: Product) {
  let h = haystackCache.get(p);
  if (!h) {
    // Variant data (colour / storage) isn't in the snapshot, so match against the title and
    // the image file names, which usually carry the colour ("…-midnight-black.jpg").
    h = [p.name, p.slug, ...(p.images ?? []).map((i) => i.src), p.image?.src ?? ""]
      .join(" ")
      .toLowerCase()
      .replace(/[-_/]+/g, " ");
    haystackCache.set(p, h);
  }
  return h;
}

export function matchesAttribute(p: Product, value: string) {
  const h = haystack(p);
  const v = value.toLowerCase();
  if (/\d+\s*\/\s*\d+\s*gb/.test(v)) {
    const [ram, rom] = v.replace(/gb/g, "").split("/").map((x) => x.trim());
    return new RegExp(`\\b${ram}\\s*(gb)?\\s*(\\+|\\s)\\s*${rom}\\s*gb`).test(h) || h.includes(`${ram} ${rom}gb`);
  }
  return v.split(/\s+/).every((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(h));
}

export function applyFilters(list: Product[], f: ListingFilters): Product[] {
  let out = list.filter((p) => {
    if (f.brand && p.brandSlug !== f.brand) return false;
    if (f.category && !p.categorySlugs.includes(f.category)) return false;
    if (f.minPrice != null && p.price < f.minPrice) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.stock.length === 1) {
      const available = p.inStock && p.price > 0;
      if (f.stock[0] === "in" ? !available : available) return false;
    }
    for (const values of Object.values(f.attributes)) {
      if (values.length && !values.some((v) => matchesAttribute(p, v))) return false;
    }
    return true;
  });
  if (f.sort === "price-asc") out = [...out].sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
  if (f.sort === "price-desc") out = [...out].sort((a, b) => b.price - a.price);
  if (f.sort === "discount") out = [...out].sort((a, b) => b.discount - a.discount);
  return out;
}

export function activeFilterCount(f: ListingFilters) {
  return (
    (f.brand ? 1 : 0) +
    (f.category ? 1 : 0) +
    (f.minPrice != null || f.maxPrice != null ? 1 : 0) +
    f.stock.length +
    Object.values(f.attributes).reduce((s, v) => s + v.length, 0)
  );
}

/** Serialize filters to a query string (kept in the URL so results are shareable). */
export function filtersToQuery(f: ListingFilters): string {
  const q = new URLSearchParams();
  if (f.brand) q.set("brand", f.brand);
  if (f.category) q.set("category", f.category);
  if (f.minPrice != null) q.set("min", String(f.minPrice));
  if (f.maxPrice != null) q.set("max", String(f.maxPrice));
  if (f.stock.length) q.set("stock", f.stock.join(","));
  if (f.sort) q.set("sort", f.sort);
  for (const [k, v] of Object.entries(f.attributes)) if (v.length) q.set(`a.${k}`, v.join("|"));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function filtersFromQuery(search: string): ListingFilters {
  const q = new URLSearchParams(search);
  const attributes: Record<string, string[]> = {};
  q.forEach((v, k) => {
    if (k.startsWith("a.")) attributes[k.slice(2)] = v.split("|").filter(Boolean);
  });
  const num = (k: string) => (q.get(k) != null && !Number.isNaN(Number(q.get(k))) ? Number(q.get(k)) : null);
  return {
    brand: q.get("brand"),
    category: q.get("category"),
    minPrice: num("min"),
    maxPrice: num("max"),
    stock: (q.get("stock")?.split(",").filter((s) => s === "in" || s === "out") as ("in" | "out")[]) ?? [],
    attributes,
    sort: (sortOptions.find((o) => o.value === q.get("sort"))?.value ?? "") as SortKey,
  };
}
