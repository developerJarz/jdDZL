"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { formatPlain } from "@/lib/format";
import type { ImageAsset } from "@/types";

interface Suggestion {
  slug: string;
  name: string;
  image: ImageAsset | null;
  price: number;
  regularPrice: number;
  isTba: boolean;
}
interface SuggestResponse {
  total: number;
  products: Suggestion[];
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string; logo: ImageAsset | null }[];
}

const RECENT_KEY = "dz-recent-searches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function HeaderSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [trending, setTrending] = useState<Suggestion[] | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read persisted searches when opening
    setRecent(readRecent());
    if (!trending) {
      fetch("/api/search?trending=1")
        .then((r) => r.json())
        .then((d: SuggestResponse) => setTrending(d.products))
        .catch(() => setTrending([]));
    }
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, trending]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale suggestions
      setData(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: SuggestResponse) => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const submit = (term: string) => {
    const value = term.trim();
    if (!value) return;
    const next = [value, ...readRecent().filter((r) => r !== value)].slice(0, 8);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  const close = () => setOpen(false);

  return (
    <div ref={boxRef} className="relative">
      <form
        role="search"
        className="relative group"
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
      >
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-400 transition-colors">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && close()}
          placeholder="Search for the item"
          aria-label="Search products"
          className="w-full text-[16px] bg-background dark:text-[#ffffff] text-gray-800 placeholder-gray-400 rounded-[10px] px-5 pl-11 py-2.5 outline-none border border-transparent focus:border-[#D4A97A]/50 transition-all duration-200 lg:h-13.5 h-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        )}
      </form>

      <div
        className={
          "bg-white dark:bg-[#2e2b28] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-600 max-h-[80vh] overflow-y-auto transition-all duration-300 ease-in-out z-[1001] " +
          (compact ? "fixed left-2 right-2 top-[118px] " : "absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[min(1040px,calc(100vw-16px))] ") +
          (open ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none -translate-y-2")
        }
      >
        <div className="flex flex-col lg:flex-row lg:divide-x divide-gray-100 dark:divide-gray-700">
          {data && q.trim().length >= 2 ? (
            <>
              <div className="w-full lg:w-[220px] xl:w-[200px] shrink-0 p-4 lg:p-5 border-b lg:border-b-0 border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Categories</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {data.categories.length ? (
                    data.categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/categories/${c.slug}`}
                        onClick={close}
                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-200 hover:border-[#D4A97A]"
                      >
                        {c.name}
                      </Link>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">No categories</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Choose From Brands</p>
                <div className="flex flex-wrap gap-3">
                  {data.brands.map((b) => (
                    <Link key={b.slug} href={`/brands/${b.slug}`} onClick={close} className="flex flex-col items-center gap-2 w-14">
                      <span className="relative w-14 h-14 rounded-xl bg-gray-50 dark:bg-white/10 p-2">
                        <span className="relative block w-full h-full">
                          <Img asset={b.logo} alt={b.name} fill sizes="56px" className="object-contain" />
                        </span>
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-300 text-center line-clamp-1">{b.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex-1 p-4 lg:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">Products</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Total Products: {data.total}</p>
                </div>
                {data.products.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    {data.products.map((p) => (
                      <SuggestionRow key={p.slug} p={p} onPick={close} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-6">No products found for “{q}”.</p>
                )}
                {data.total > data.products.length && (
                  <button type="button" onClick={() => submit(q)} className="mt-3 text-sm font-semibold text-[#CB843B] hover:underline">
                    View all {data.total} results
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-full lg:w-[220px] xl:w-[260px] shrink-0 p-4 lg:p-5 border-b lg:border-b-0 border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">Recent Searches</span>
                  {recent.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        localStorage.removeItem(RECENT_KEY);
                        setRecent([]);
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {recent.length ? (
                    recent.map((r) => (
                      <li key={r}>
                        <button type="button" onClick={() => submit(r)} className="w-full text-left text-sm text-gray-600 dark:text-gray-300 py-2 hover:text-[#CB843B]">
                          {r}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-gray-400 dark:text-gray-500 py-2">No recent searches</li>
                  )}
                </ul>
              </div>
              <div className="flex-1 p-4 lg:p-5">
                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">{loading ? "Searching…" : "Trending Searches"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {trending
                    ? trending.map((p) => <SuggestionRow key={p.slug} p={p} onPick={close} />)
                    : Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl animate-pulse">
                          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
                          </div>
                        </div>
                      ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionRow({ p, onPick }: { p: Suggestion; onPick: () => void }) {
  return (
    <Link href={`/product/${p.slug}`} onClick={onPick} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5">
      <span className="relative w-14 h-14 shrink-0 rounded-lg border border-gray-100 dark:border-gray-600 bg-white overflow-hidden">
        <Img asset={p.image} alt={p.name} fill sizes="56px" className="object-contain p-1" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-gray-800 dark:text-white line-clamp-1">{p.name}</span>
        {p.isTba || p.price <= 0 ? (
          <span className="inline-block mt-1 text-[9px] font-bold text-white bg-[#6D3F0E] rounded-full px-2 py-0.5">To Be Announced</span>
        ) : (
          <span className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[15px] font-bold text-gray-900 dark:text-white">৳{formatPlain(p.price)}</span>
            {p.regularPrice > p.price && <span className="text-xs text-gray-400 line-through">৳{formatPlain(p.regularPrice)}</span>}
          </span>
        )}
      </span>
    </Link>
  );
}
