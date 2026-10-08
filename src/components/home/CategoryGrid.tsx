"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Img } from "@/components/ui/Img";
import type { ImageAsset } from "@/types";

interface Item {
  slug: string;
  name: string;
  image: ImageAsset | null;
}

/**
 * Category tiles: 4 columns × 2 rows per page on phones, a single row of 8 on desktop,
 * horizontally paged with gold bullets (reference: Swiper grid on ".categories-swiper").
 */
export function CategoryGrid({ items }: { items: Item[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      setPages(Math.max(1, Math.round(el.scrollWidth / el.clientWidth)));
      setPage(Math.round(el.scrollLeft / el.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="pt-1 pb-4">
      <div
        ref={track}
        onScroll={() => track.current && setPage(Math.round(track.current.scrollLeft / track.current.clientWidth))}
        className="grid grid-rows-2 lg:grid-rows-1 grid-flow-col auto-cols-[calc((100%-30px)/4)] gap-[10px] min-[480px]:gap-3 sm:gap-3.5 md:gap-4 lg:auto-cols-[calc((100%-112px)/8)] lg:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {items.map((c, i) => {
          // phones show 4×2 pages filled row by row; the column-flow grid needs an explicit order
          const page = Math.floor(i / 8);
          const pos = i % 8;
          const mobileOrder = page * 8 + (pos % 4) * 2 + Math.floor(pos / 4);
          return (
          <Link
            key={c.slug}
            href={`/categories/${c.slug}`}
            style={{ "--o": mobileOrder } as React.CSSProperties}
            className={"w-full flex flex-col items-center gap-2 group focus:outline-none cursor-pointer pb-2 order-(--o) lg:order-none " + (pos === 0 ? "snap-start" : "")}
          >
            <div className="w-full aspect-square rounded-[28px] overflow-hidden transition-all duration-300 flex items-center justify-center p-3 sm:p-4 relative bg-[#F5F5F5] border border-[#F5F5F5] shadow-sm dark:bg-[#342a20] dark:border-[#B57908] group-hover:bg-[#fcf5ed] group-hover:border-[#E9CCAE]">
              <div className="relative w-full h-full flex items-center justify-center">
                <Img asset={c.image} alt={c.name} fill sizes="(max-width: 768px) 25vw, 12vw" className="object-contain p-2 transition-all duration-300 group-hover:scale-105" />
              </div>
            </div>
            <h3 className="w-full text-[14px] font-medium text-primary pt-1 sm:pt-2 text-center transition-colors duration-300 group-hover:text-[#CB843B] line-clamp-2 leading-tight min-h-[22px] sm:min-h-[26px] lg:min-h-[36px] flex items-start justify-center">
              {c.name}
            </h3>
          </Link>
          );
        })}
      </div>
      {pages > 1 && (
        <div className="dz-bullets mt-1">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className="dz-bullet"
              aria-label={`Show categories page ${i + 1}`}
              aria-current={i === page ? "true" : undefined}
              onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
