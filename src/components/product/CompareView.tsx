"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { formatPlain } from "@/lib/format";
import type { Product } from "@/types";

const MAX = 6;

interface Suggestion {
  slug: string;
  name: string;
}

/** Side-by-side product comparison (reference: /product-compare/:slug, up to 6 products). */
export function CompareView({ initial }: { initial: Product }) {
  const [items, setItems] = useState<Product[]>([initial]);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale suggestions
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { products: Suggestion[] }) => setSuggestions(d.products.slice(0, 8)))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const add = async (slug: string) => {
    setQ("");
    setSuggestions([]);
    if (items.some((p) => p.slug === slug) || items.length >= MAX) return;
    const res = await fetch(`/api/products?slugs=${encodeURIComponent(slug)}`);
    const { products } = (await res.json()) as { products: Product[] };
    if (products[0]) setItems((cur) => [...cur, products[0]]);
  };

  const rows: { label: string; value: (p: Product) => React.ReactNode }[] = [
    { label: "Brand", value: (p) => p.brandName ?? "—" },
    { label: "Regular Price", value: (p) => (p.regularPrice > 0 ? `৳${formatPlain(p.regularPrice)}` : "—") },
    { label: "Special Price", value: (p) => (p.price > 0 && !p.isTba ? `৳${formatPlain(p.price)}` : "To Be Announced") },
    { label: "Discount", value: (p) => (p.discount > 0 ? `${Math.round(p.discount * 100) / 100}%` : "—") },
    { label: "Availability", value: (p) => (p.isTba ? "Coming soon" : p.inStock ? "In Stock" : "Out of Stock") },
  ];

  return (
    <div className="bg-white dark:bg-[#1c1a17] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-3 bg-gray-50 dark:bg-[#25221f] border-b border-gray-100 dark:border-gray-800">
        {items.map((p) => (
          <div key={p.slug} className="relative flex items-center gap-3 p-4 md:justify-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
            <Link href={`/product/${p.slug}`} className="relative w-14 h-14 shrink-0 rounded-lg bg-white border border-gray-100">
              <Img asset={p.image} alt={p.name} fill sizes="56px" className="object-contain p-1" />
            </Link>
            <div className="min-w-0">
              <Link href={`/product/${p.slug}`} className="block text-sm font-medium text-gray-900 dark:text-white line-clamp-2 hover:underline">
                {p.name}
              </Link>
              {p.regularPrice > 0 && <p className="text-xs text-gray-500">Regular Price ৳{formatPlain(p.regularPrice)}</p>}
              {p.price > 0 && !p.isTba && <p className="text-xs text-[#B57908] font-medium">Special Price ৳{formatPlain(p.price)}</p>}
            </div>
            {items.length > 1 && (
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => setItems((cur) => cur.filter((x) => x.slug !== p.slug))}
                className="absolute top-3 right-3 w-7 h-7 rounded-full border border-gray-200 text-gray-500 hover:text-red-500 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {items.length < MAX && (
          <div className="relative p-4 flex items-center">
            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width={16} height={16} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Add product..."
                aria-label="Add product to compare"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2e2b28] pl-9 pr-3 text-sm outline-none focus:border-[#D4A97A] dark:text-white"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-[#2e2b28] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-72 overflow-y-auto">
                  {suggestions.map((s) => (
                    <li key={s.slug}>
                      <button type="button" onClick={() => add(s.slug)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white">
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
      {items.length > 1 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-gray-100 dark:border-gray-800">
                  <th scope="row" className="text-left font-medium text-gray-500 px-4 py-3 w-40 bg-gray-50/60 dark:bg-transparent">
                    {r.label}
                  </th>
                  {items.map((p) => (
                    <td key={p.slug} className="px-4 py-3 text-gray-900 dark:text-white">
                      {r.value(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-3">Detailed specifications load from the product API and aren&apos;t part of the offline catalogue.</p>
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-gray-400">No specification data available for this product.</p>
      )}
    </div>
  );
}
