"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FilterIcon, SortIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { Carousel } from "@/components/ui/Carousel";
import { Img } from "@/components/ui/Img";
import { goldTitle } from "@/components/ui/Section";
import { cn } from "@/lib/format";
import { activeFilterCount, applyFilters, emptyFilters, filtersFromQuery, filtersToQuery, sortOptions, type ListingFilters } from "@/lib/listing";
import type { Banner, FilterAttribute, Product } from "@/types";
import { FilterPanel, FilterSidebar } from "./FilterSidebar";

export interface ListingViewProps {
  /** shown as "Products of <title>" */
  title: string;
  products: Product[];
  brands?: { slug: string; name: string }[];
  /** chips filtering by top-level category (brand pages) */
  categoryChips?: { slug: string; name: string }[];
  /** extra chips linking elsewhere (brand page → its categories) */
  linkChips?: { label: string; href: string }[];
  attributes: FilterAttribute[];
  price: { min: number; max: number };
  banners?: Banner[];
  topSelling?: Product[];
  trending?: Product[];
  descriptionHtml?: string;
  pageSize?: number;
  /** hide the sidebar (showcase pages) */
  showFilters?: boolean;
  emptyMessage?: string;
}

export function ListingView({
  title,
  products,
  brands = [],
  categoryChips = [],
  linkChips = [],
  attributes,
  price,
  banners = [],
  topSelling = [],
  trending = [],
  descriptionHtml,
  pageSize = 12,
  showFilters = true,
  emptyMessage = "No products match these filters.",
}: ListingViewProps) {
  const [filters, setFilters] = useState<ListingFilters>(emptyFilters);
  const [visible, setVisible] = useState(pageSize);
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  // read ?brand=&min=… once on mount (kept out of render so the static HTML stays cacheable)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(filtersFromQuery(window.location.search));
    hydrated.current = true;
  }, []);

  const update = (f: ListingFilters) => {
    setFilters(f);
    setVisible(pageSize);
    if (hydrated.current) window.history.replaceState(null, "", window.location.pathname + filtersToQuery(f));
  };

  const filtered = useMemo(() => applyFilters(products, filters), [products, filters]);
  const shown = filtered.slice(0, visible);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || visible >= filtered.length) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && setVisible((v) => v + pageSize), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, filtered.length, pageSize]);

  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const count = activeFilterCount(filters);
  const chipBase = "px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap shrink-0";
  const chipIdle =
    "bg-white dark:bg-[#2a2420] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#6D3F0E] hover:text-[#6D3F0E]";
  const chipActive = "bg-[#6D3F0E] text-white border-[#6D3F0E]";

  return (
    <div>
      {(brands.length > 1 || categoryChips.length > 1 || linkChips.length > 0) && (
        <div className="md:px-12.5 px-4 mt-1 flex flex-row md:flex-wrap flex-nowrap gap-2 overflow-x-auto md:overflow-visible py-2 no-scrollbar">
          {brands.length > 1 && (
            <>
              <button type="button" onClick={() => update({ ...filters, brand: null })} className={cn(chipBase, !filters.brand ? chipActive : chipIdle)}>
                All
              </button>
              {[...brands].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })).map((b) => (
                <button
                  key={b.slug}
                  type="button"
                  aria-pressed={filters.brand === b.slug}
                  onClick={() => update({ ...filters, brand: filters.brand === b.slug ? null : b.slug })}
                  className={cn(chipBase, "px-3", filters.brand === b.slug ? chipActive : chipIdle)}
                >
                  {b.name}
                </button>
              ))}
            </>
          )}
          {categoryChips.length > 1 && (
            <>
              <button type="button" onClick={() => update({ ...filters, category: null })} className={cn(chipBase, !filters.category ? chipActive : chipIdle)}>
                All
              </button>
              {categoryChips.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={filters.category === c.slug}
                  onClick={() => update({ ...filters, category: filters.category === c.slug ? null : c.slug })}
                  className={cn(chipBase, "px-3", filters.category === c.slug ? chipActive : chipIdle)}
                >
                  {c.name}
                </button>
              ))}
            </>
          )}
          {linkChips.map((c) => (
            <Link key={c.href} href={c.href} className={cn(chipBase, "px-3", chipIdle)}>
              {c.label}
            </Link>
          ))}
        </div>
      )}

      {/* phone heading + floating filter/sort pill */}
      <div className="md:hidden flex px-4 pt-2 flex-wrap items-center justify-between gap-3 relative">
        <h2 className={"text-[20px] font-bold " + goldTitle}>
          Products of <span className="capitalize">{title}</span>
        </h2>
      </div>
      {showFilters && (
        <div className="lg:hidden flex items-center fixed gap-3 bg-[#6d3f0e] px-4 py-2 rounded-full bottom-24 z-[90] left-1/2 -translate-x-1/2 shadow-[0px_4px_19.9px_0px_#00000066]">
          <button type="button" onClick={() => setSheet("filter")} className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <FilterIcon />
            Filter{count ? ` (${count})` : ""}
          </button>
          <span className="text-white">|</span>
          <button type="button" onClick={() => setSheet("sort")} className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <SortIcon />
            Sort
          </button>
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-4 md:mt-0 mt-2 items-stretch md:px-12.5 px-4 relative", showFilters && "lg:grid-cols-12")}>
        {showFilters && (
          <aside className="lg:col-span-3 lg:flex hidden flex-col self-stretch" aria-label="Filters">
            <FilterSidebar filters={filters} price={price} attributes={attributes} onChange={update} />
          </aside>
        )}

        <div className={cn("h-full min-w-0", showFilters && "lg:col-span-9")}>
          {banners.length > 0 && (
            <Carousel ariaLabel="Category offers" autoplayMs={5000} slideClassName="w-full" bulletsClassName="mt-2 mb-4" className="mb-4">
              {banners.map((b, i) => (
                <Link key={i} href={b.href} className="block relative w-full aspect-[9/2] rounded-2xl overflow-hidden">
                  <Img asset={b.image} alt="Category banner" fill sizes="(max-width: 1024px) 100vw, 1000px" className="object-cover" priority={i === 0} />
                </Link>
              ))}
            </Carousel>
          )}

          {topSelling.length > 0 && (
            <div className="bg-[#EEEEEE] dark:bg-[#2a2420] rounded-lg py-3 px-3 mb-6">
              <div className="flex pb-4 md:px-4">
                <h2 className={"md:text-[32px] text-[18px] font-bold " + goldTitle}>Top Selling</h2>
              </div>
              <ProductCarousel products={topSelling} variant="listing" ariaLabel="Top Selling" compact />
            </div>
          )}

          {trending.length > 0 && (
            <div className="bg-[#6D3F0E] dark:bg-[#2a2420] rounded-lg py-3 px-2 mb-6">
              <div className="flex pb-4 md:px-4">
                <h2 className="text-[20px] sm:text-[24px] md:text-[32px] font-bold bg-linear-to-r from-white to-[#CB843B] bg-clip-text text-transparent">Trending</h2>
              </div>
              <ProductCarousel products={trending} variant="listing" ariaLabel="Trending" compact />
            </div>
          )}

          <div className="scroll-mt-4" id="products">
            <div className="md:flex md:flex-wrap items-center justify-between gap-3 pb-3 hidden">
              <div>
                <h2 className={"md:text-[32px] text-[20px] font-bold " + goldTitle}>
                  Products of <span className="capitalize">{title}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{filtered.length.toLocaleString("en-US")} products found</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span>Sort by</span>
                <select
                  value={filters.sort}
                  onChange={(e) => update({ ...filters, sort: e.target.value as ListingFilters["sort"] })}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-[#2a2420] text-sm"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="md:hidden text-xs text-gray-400 pb-1">{filtered.length.toLocaleString("en-US")} products found</p>

            {shown.length ? (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 grid-cols-2 lg:gap-4 gap-2 py-3">
                {shown.map((p, i) => (
                  <ProductCard key={p.slug} product={p} variant="listing" priority={i < 4} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-gray-500">{emptyMessage}</p>
                {count > 0 && (
                  <button type="button" onClick={() => update({ ...emptyFilters, sort: filters.sort })} className="mt-4 text-sm font-semibold text-[#CB843B] underline">
                    Clear filters
                  </button>
                )}
              </div>
            )}
            <div ref={sentinel} className="h-10 w-full" aria-hidden="true" />
            {visible < filtered.length && (
              <div className="flex justify-center pb-6">
                <button type="button" onClick={() => setVisible((v) => v + pageSize)} className="rounded-full px-6 py-2 text-sm font-semibold border border-gray-700 dark:border-gray-400 dark:text-white hover:bg-gray-700 hover:text-white">
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {descriptionHtml && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start relative">
          <div className="lg:col-span-3 lg:block hidden" />
          <div className="lg:col-span-9 min-w-0">
            <section className="md:px-12.5 px-4 pb-14 pt-6 overflow-hidden">
              <div className="max-w-4xl">
                <article
                  className="cms-content text-sm leading-relaxed text-[#222] dark:text-white dark-html-content [&_h1]:font-bold [&_h1]:text-2xl [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-5 [&_h3]:mb-2 [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_p]:mb-3 [&_li]:mb-1 [&_a]:text-[#CB843B]! [&_a]:underline [&_img]:rounded-lg [&_table]:border [&_table]:border-gray-200 [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </div>
            </section>
          </div>
        </div>
      )}

      {/* phone sheets */}
      {sheet && (
        <div className="fixed inset-0 z-[1500] bg-black/40 lg:hidden" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet === "filter" ? "Filters" : "Sort"}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-white dark:bg-[#2e2b28] rounded-t-3xl p-5 pb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#222] dark:text-white">{sheet === "filter" ? "Filter" : "Sort by"}</h2>
              <button type="button" aria-label="Close" onClick={() => setSheet(null)} className="text-2xl leading-none text-gray-500">
                ×
              </button>
            </div>
            {sheet === "filter" ? (
              <>
                <FilterPanel filters={filters} price={price} attributes={attributes} onChange={update} />
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => update({ ...emptyFilters, sort: filters.sort })} className="flex-1 h-11 rounded-xl border border-gray-300 font-semibold text-sm dark:text-white">
                    Reset
                  </button>
                  <button type="button" onClick={() => setSheet(null)} className="flex-1 h-11 rounded-xl bg-[#6D3F0E] text-white font-semibold text-sm">
                    Show {filtered.length} results
                  </button>
                </div>
              </>
            ) : (
              <ul className="space-y-1">
                {sortOptions.map((o) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => {
                        update({ ...filters, sort: o.value });
                        setSheet(null);
                      }}
                      className={cn("w-full text-left px-4 py-3 rounded-xl text-sm", filters.sort === o.value ? "bg-[#FDF3E7] font-semibold text-[#6D3F0E]" : "text-gray-700 dark:text-gray-200")}
                    >
                      {o.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
