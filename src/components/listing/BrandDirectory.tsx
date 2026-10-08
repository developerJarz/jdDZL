"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Img } from "@/components/ui/Img";
import { cn } from "@/lib/format";
import type { ImageAsset } from "@/types";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** /brands: search box + A–Z filter + logo grid. */
export function BrandDirectory({ brands }: { brands: { slug: string; name: string; logo: ImageAsset | null }[] }) {
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.filter((b) => (!q || b.name.toLowerCase().includes(q)) && (!letter || b.name.toUpperCase().startsWith(letter)));
  }, [brands, query, letter]);

  const btn = "min-w-9 h-9 px-3 rounded-lg text-sm font-medium border transition-all duration-300";
  const idle = "bg-white text-black border-gray-300 hover:border-black dark:bg-[#1A1A1A] dark:text-white dark:border-gray-700 dark:hover:border-[#D4A97A]";
  const active = "bg-black text-white border-black dark:bg-[#D4A97A] dark:text-black dark:border-[#D4A97A]";

  return (
    <div className="w-full py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 mb-6 gap-4">
        <div className="lg:col-span-4 w-full">
          <label htmlFor="brand-search" className="sr-only">
            Search brand
          </label>
          <input
            id="brand-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand..."
            className="w-full h-12 rounded-xl border border-gray-300 text-[16px] dark:border-gray-700 bg-white dark:bg-[#1A1A1A] px-4 text-black dark:text-white placeholder:text-gray-400 outline-none focus:border-[#D4A97A]"
          />
        </div>
        <div className="lg:col-span-8 flex flex-wrap gap-2" role="group" aria-label="Filter by first letter">
          <button type="button" onClick={() => setLetter(null)} className={cn(btn, !letter ? active : idle)}>
            All
          </button>
          {LETTERS.map((l) => (
            <button key={l} type="button" aria-pressed={letter === l} onClick={() => setLetter(letter === l ? null : l)} className={cn(btn, letter === l ? active : idle)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {visible.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-4 gap-2">
          {visible.map((b) => (
            <Link
              key={b.slug}
              href={`/brands/${b.slug}`}
              className="flex w-full flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white hover:border-[#D4A97A] transition-all duration-300"
            >
              <span className="relative h-16 w-full max-w-40">
                {b.logo ? (
                  <Img asset={b.logo} alt={b.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1024px) 20vw, 160px" className="object-contain" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xl font-bold text-gray-700">{b.name}</span>
                )}
              </span>
              <span className="text-[16px] font-medium text-black">{b.name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-gray-500">No brands match “{query || letter}”.</p>
      )}
    </div>
  );
}
