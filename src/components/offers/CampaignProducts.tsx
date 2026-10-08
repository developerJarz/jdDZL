"use client";

import { useMemo, useState } from "react";
import { FilterIcon } from "@/components/icons";
import { FilterPanel } from "@/components/listing/FilterSidebar";
import { ProductCard } from "@/components/product/ProductCard";
import { Dialog } from "@/components/ui/Dialog";
import { applyFilters, emptyFilters, type ListingFilters } from "@/lib/listing";
import type { Product } from "@/types";

/** Campaign product grid with the reference's "Filter" popover (budget + stock). */
export function CampaignProducts({ products, countdown }: { products: Product[]; countdown?: React.ReactNode }) {
  const [filters, setFilters] = useState<ListingFilters>(emptyFilters);
  const [open, setOpen] = useState(false);
  const prices = products.map((p) => p.price).filter((n) => n > 0);
  const price = { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 };
  const shown = useMemo(() => applyFilters(products, filters), [products, filters]);

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {countdown && (
            <>
              <span className="text-[#101518] dark:text-white text-sm font-medium">Offer Ending In</span>
              {countdown}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-sm rounded-[10px] py-1.5 px-3 border transition-colors border-[#EEEEEE] dark:border-white/10 text-gray-700 dark:text-white"
        >
          <FilterIcon width={14} height={14} />
          Filter
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">{shown.length} products found</p>
      {shown.length ? (
        <div className="grid md:grid-cols-4 xl:grid-cols-5 grid-cols-2 gap-3">
          {shown.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-gray-500">No products available.</p>
      )}
      {open && (
        <Dialog title="Filter" onClose={() => setOpen(false)}>
          <FilterPanel filters={filters} price={price} attributes={[]} onChange={setFilters} />
          <button type="button" onClick={() => setOpen(false)} className="w-full h-11 rounded-xl bg-[#6D3F0E] text-white font-semibold text-sm mt-2">
            Show {shown.length} results
          </button>
        </Dialog>
      )}
    </>
  );
}
