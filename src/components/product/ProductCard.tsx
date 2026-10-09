"use client";

import Link from "next/link";
import { useState } from "react";
import { BasketIcon, CompareIcon, EyeIcon, HeartIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import { useStore } from "@/context/store";
import { cn, formatDiscount } from "@/lib/format";
import type { Product } from "@/types";
import { Price } from "./Price";
import { QuickView } from "./QuickView";

export interface ProductCardProps {
  product: Product;
  /**
   * "home": rounded discount, recognition badge as a green pill under the image.
   * "listing": exact discount, recognition badge as a gold tag over the image.
   */
  variant?: "home" | "listing";
  className?: string;
  priority?: boolean;
  /** tighter buttons for narrow rows (5-up inside the listing column) */
  compact?: boolean;
}

const notchClip =
  "shape(from 0 100%,curve by var(--r) calc(-1 * var(--r)) with var(--r) 0,vline to var(--r),curve by var(--r) calc(-1 * var(--r)) with 0 calc(-1 * var(--r)),hline to 100%,vline to 100%,hline to 0)";

export function ProductCard({ product: p, variant = "home", className, priority, compact = false }: ProductCardProps) {
  const { addToCart, toggleWishlist, inWishlist } = useStore();
  const [quickView, setQuickView] = useState(false);
  const href = `/product/${p.slug}`;
  const comingSoon = p.isTba || p.price <= 0;
  const wished = inWishlist(p.slug);
  const wishItem = { slug: p.slug, name: p.name, image: p.image, price: p.price };

  return (
    <div
      data-product-slug={p.slug}
      className={cn(
        "group relative bg-white rounded-2xl sm:rounded-3xl cursor-pointer w-full h-full flex flex-col shadow-lg transition-all duration-500 hover:shadow-sm select-none",
        className,
      )}
    >
      <div className="bg-white p-2 sm:p-3 lg:p-4 pb-0! rounded-2xl sm:rounded-3xl relative">
        <div className="flex justify-between items-start mb-2 sm:mb-3 h-5 sm:h-6 absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 z-40">
          {p.discount > 0 && !comingSoon ? (
            <span className="bg-[#ff7575] text-white text-[9px] sm:text-xs font-bold px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md">
              {formatDiscount(p.discount, variant === "listing")}%
            </span>
          ) : (
            <span />
          )}
          {p.badge ? (
            <span className="bg-[linear-gradient(93.36deg,#222222_-28.88%,#6D3F0E_93.21%)] text-white text-[9px] sm:text-xs font-bold px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md max-w-[80%] truncate">
              {p.badge}
            </span>
          ) : (
            <span />
          )}
        </div>
        {variant === "listing" && p.recognitionBadge && (
          <div className="absolute top-8 sm:top-10 right-2 sm:right-3 z-40">
            <span className="bg-[linear-gradient(90deg,#B57908_0%,#E9CCAE_100%)] text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 rounded-full shadow-md">
              {p.recognitionBadge}
            </span>
          </div>
        )}
        <Link href={href} className="block px-2 pt-2" aria-label={p.name}>
          <div className="relative flex justify-center items-center h-42 transition-all duration-500">
            <div className="relative z-10 w-full h-full transition-transform duration-500 group-hover:scale-105">
              <Img
                asset={p.image}
                alt={p.name}
                fill
                priority={priority}
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 280px"
                className="object-contain! p-1 transition-transform duration-300"
              />
            </div>
          </div>
        </Link>
        <div className="flex items-center justify-between relative z-40">
          {variant === "home" && p.recognitionBadge && (
            <span className="ml-auto bg-[#087400] text-white text-[8px] sm:text-xs font-bold px-1 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md lg:w-[50%]! w-[80%] flex justify-center items-center gap-1">
              {p.recognitionBadge}
            </span>
          )}
          <div
            className="flex gap-1 sm:gap-2 ml-auto p-1 -mr-2 sm:-mr-2 lg:-mr-4 bg-[#F5F5F5] pl-2 [--r:20px] sm:[--r:26px] w-[110px]"
            style={{ clipPath: notchClip }}
          >
            <button
              type="button"
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wished}
              onClick={() => toggleWishlist(wishItem)}
              className={cn(
                "w-8 h-8 mt-1 rounded-full ml-[25px] border flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-white",
                wished ? "border-red-300 text-red-500 [&_path]:fill-red-500" : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400",
              )}
            >
              <HeartIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <Link
              href={`/product-compare/${p.slug}`}
              aria-label="Compare"
              className="w-8 h-8 mt-1 rounded-full border flex items-center justify-center transition-all duration-300 border-gray-200 bg-white text-gray-500 hover:border-purple-300 hover:text-purple-500 hover:scale-110 active:scale-95"
            >
              <CompareIcon />
            </Link>
          </div>
        </div>
      </div>

      <div className="p-2 sm:p-3 lg:p-4 flex flex-col flex-1 bg-[#F5F5F5] rounded-tl-2xl rounded-b-2xl">
        <div className="text-left relative">
          <Link href={href}>
            <h3 className="font-semibold dark:text-[#222] text-[15px] leading-[1.5] line-clamp-2 h-11 text-[#575757] max-[640px]:text-[13px]" title={p.name}>
              {p.name}
              {!comingSoon && (
                <span className={p.inStock ? "text-[#03A000] font-bold" : "text-red-500 font-bold"}> {p.inStock ? "In Stock" : "Out of Stock"}</span>
              )}
            </h3>
          </Link>
          <div
            role="tooltip"
            className="hidden sm:block pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[60] w-max max-w-[220px] whitespace-normal rounded-lg bg-gray-900 text-white text-xs px-2.5 py-1.5 shadow-lg opacity-0 scale-95 origin-bottom transition-all duration-300 group-hover:opacity-100 group-hover:scale-100"
          >
            {p.name}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
        <Link href={href} className="flex items-baseline gap-2 sm:gap-2 mb-2 sm:mb-4">
          {comingSoon ? (
            <div className="h-7.5">
              <div className="bg-[#6D3F0E] text-white text-[9px] sm:text-xs font-bold px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md">To Be Announced</div>
            </div>
          ) : (
            <Price price={p.price} regularPrice={p.regularPrice} />
          )}
        </Link>
        <div className="flex gap-1 sm:gap-2 mt-auto">
          {comingSoon || !p.inStock ? (
            <button
              type="button"
              onClick={() => toggleWishlist(wishItem)}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              className="flex-1 flex items-center justify-center gap-2 h-11 px-1 rounded-[13px] text-[13px] sm:text-[14px] leading-none font-semibold border transition-all duration-300 active:scale-95 bg-white border-orange-200 text-[#6D3F0E] hover:bg-orange-50 hover:border-orange-400 hover:shadow-md"
            >
              <HeartIcon className="w-4 h-4 shrink-0" />
              <span>{wished ? "In Wishlist" : "Add to Wishlist"}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  addToCart({ slug: p.slug, name: p.name, image: p.image, price: p.price, regularPrice: p.regularPrice })
                }
                className={cn("flex-1 flex items-center justify-center gap-2.5 h-11 py-[5px] px-1 rounded-[13px] leading-none whitespace-nowrap", compact ? "text-[13px] xl:text-[14px] gap-1.5" : "text-[16px] max-[640px]:text-[14px]", " font-semibold border transition-all duration-300 active:scale-95 shadow-[0px_0px_8px_4px_#E9CCAE52] bg-white border-orange-200 text-[#6D3F0E] hover:bg-orange-50 hover:border-orange-400 hover:shadow-md")}
              >
                <BasketIcon className={cn("w-5 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 shrink-0 hidden", compact ? "xl:block" : "md:block")} />
                <span>Add to Cart</span>
              </button>
              <div>
                <button
                  type="button"
                  aria-label="Quick view"
                  onClick={() => setQuickView(true)}
                  className="lg:w-11 lg:h-11 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all duration-300 hover:scale-110 active:scale-95"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {quickView && <QuickView product={p} onClose={() => setQuickView(false)} />}
    </div>
  );
}
