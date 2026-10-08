"use client";

import Link from "next/link";
import { BasketIcon } from "@/components/icons";
import { Carousel } from "@/components/ui/Carousel";
import { Img } from "@/components/ui/Img";
import { useStore } from "@/context/store";
import { formatPlain } from "@/lib/format";
import type { Product } from "@/types";

export interface Clip {
  product: Product;
  /** short product video; the reference streams these from its API (not in the snapshot) */
  videoUrl: string | null;
  poster: Product["image"];
}

/**
 * "Clip to Cart" — shoppable video cards. Clip media were loaded client-side on the
 * reference and are not part of the snapshot, so cards fall back to the product shot as a
 * poster and only show a play control when a `videoUrl` is provided.
 */
export function ClipToCart({ clips }: { clips: Clip[] }) {
  const { addToCart } = useStore();
  return (
    <Carousel
      ariaLabel="Clip to Cart"
      slideClassName="w-[calc((100%-2px)/1.2)] min-[480px]:w-[calc((100%-6px)/1.5)] sm:w-[calc((100%-14px)/2)] md:w-[calc((100%-16px)/2)] lg:w-[calc((100%-40px)/5)]"
      gapClassName="gap-2.5 min-[480px]:gap-3 sm:gap-3.5 md:gap-4 lg:gap-2.5"
      bulletsClassName="mt-5"
    >
      {clips.map(({ product: p, videoUrl, poster }) => (
        <div key={p.slug} className="rounded-2xl overflow-hidden bg-white dark:bg-[#2e2b28] h-full flex flex-col">
          <div className="relative aspect-[4/5] bg-[radial-gradient(circle_at_50%_35%,#f7e3c3_0%,#c79a55_55%,#6D3F0E_100%)]">
            {videoUrl ? (
              <video src={videoUrl} poster={poster?.src} controls playsInline className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <Img asset={poster} alt={p.name} fill sizes="(max-width: 640px) 80vw, 260px" className="object-contain p-8 mix-blend-multiply" />
            )}
          </div>
          <div className="relative px-3 pt-9 pb-4 flex flex-col flex-1">
            <span className="absolute left-1/2 -translate-x-1/2 -top-8 w-16 h-16 rounded-full bg-white shadow-md border border-gray-100 overflow-hidden">
              <Img asset={p.image} alt="" fill sizes="64px" className="object-contain p-2" />
            </span>
            <Link href={`/product/${p.slug}`} className="text-[13px] sm:text-sm font-semibold text-[#B57908] leading-snug line-clamp-2 min-h-[40px] hover:underline">
              {p.name}
            </Link>
            <div className="flex items-end justify-between mt-auto pt-3">
              <div>
                <p className="text-[15px] font-bold text-[#222] dark:text-white">৳{formatPlain(p.price)}</p>
                {p.regularPrice > p.price && <p className="text-xs text-gray-400 line-through">৳{formatPlain(p.regularPrice)}</p>}
              </div>
              <button
                type="button"
                aria-label={`Add ${p.name} to cart`}
                onClick={() => addToCart({ slug: p.slug, name: p.name, image: p.image, price: p.price, regularPrice: p.regularPrice })}
                className="w-9 h-9 rounded-full bg-[#222] text-[#E9CCAE] flex items-center justify-center hover:bg-black"
              >
                <BasketIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </Carousel>
  );
}
