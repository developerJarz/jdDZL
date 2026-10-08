"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { Carousel } from "@/components/ui/Carousel";
import { Img } from "@/components/ui/Img";
import { cn } from "@/lib/format";
import type { Brand, Product } from "@/types";

/** Brand tiles; selecting one swaps the product row below (reference fetched /products?brandSlug=). */
export function ShopByBrand({ brands, productsByBrand }: { brands: Brand[]; productsByBrand: Record<string, Product[]> }) {
  const [active, setActive] = useState(brands[0]?.slug);
  const products = (active && productsByBrand[active]) || [];
  return (
    <div className="bg-[#FFFBF7] lg:dark:bg-[#1a1816] dark:bg-[#2e2b28] rounded-3xl lg:px-4 lg:py-6">
      <div className="mb-6">
        <Carousel
          ariaLabel="Brands"
          bullets={false}
          slideClassName="w-[calc((100%-18px)/4)] lg:w-[calc((100%-70px)/8)]"
          gapClassName="gap-[6px] lg:gap-[10px]"
        >
          {brands.map((b) => {
            const selected = b.slug === active;
            return (
              <button
                key={b.slug}
                type="button"
                aria-pressed={selected}
                onClick={() => setActive(b.slug)}
                className="w-full flex flex-col items-center gap-2 group focus:outline-none cursor-pointer mt-3"
              >
                <span
                  className={cn(
                    "w-full aspect-square rounded-[28px] transition-all duration-300 flex items-center justify-center p-3 sm:p-4",
                    selected
                      ? "bg-[#FFF4E8] border border-[#E9CCAE] shadow-sm dark:bg-[#342a20] dark:border-[#B57908]"
                      : "bg-[#F3F3F5] border border-transparent dark:bg-zinc-800/80 hover:bg-[#F0ECF8]",
                  )}
                >
                  <span className="relative w-full aspect-square p-3 md:p-8 transition-all duration-300 hover:scale-105">
                    <Img asset={b.logo} alt={b.name} fill sizes="(max-width: 768px) 25vw, 20vw" className="object-contain transition-transform duration-300 hover:scale-110" />
                  </span>
                </span>
                <span
                  className={cn(
                    "text-[11px] lg:text-xs font-semibold text-center leading-tight transition-colors",
                    selected ? "text-[#101518] dark:text-white" : "text-gray-600 dark:text-gray-400",
                  )}
                >
                  {b.name}
                </span>
              </button>
            );
          })}
        </Carousel>
      </div>
      {products.length ? (
        <ProductCarousel key={active} products={products} ariaLabel="Brand products" />
      ) : (
        <p className="text-center text-sm text-gray-500 py-10">
          No products for this brand in the offline catalogue.{" "}
          <Link href={`/brands/${active}`} className="text-[#CB843B] underline">
            Visit brand page
          </Link>
        </p>
      )}
    </div>
  );
}
