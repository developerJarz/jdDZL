"use client";

import { useState } from "react";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { cn } from "@/lib/format";
import type { Product } from "@/types";

/** Tab pills ("Newest" / "Popular" …) switching between product rows. */
export function TabbedProducts({
  tabs,
  tone = "light",
  ariaLabel,
}: {
  tabs: { label: string; products: Product[] }[];
  tone?: "light" | "dark";
  ariaLabel: string;
}) {
  const [active, setActive] = useState(0);
  const current = tabs[active] ?? tabs[0];
  if (!current) return null;
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 pb-4" role="tablist" aria-label={ariaLabel}>
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "px-4 py-2 lg:text-sm text-[13px] md:text-base font-bold rounded-lg transition-all duration-300",
              i === active
                ? tone === "dark"
                  ? "bg-[#e9ccae7a] text-[#222] dark:text-white"
                  : "bg-[#e9ccae7a] text-primary"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <ProductCarousel key={current.label} products={current.products} ariaLabel={`${ariaLabel}: ${current.label}`} />
      </div>
    </div>
  );
}
