"use client";

import { useRef, useState } from "react";
import { ChevronRightBoldIcon, ZoomInIcon } from "@/components/icons";
import { Img } from "@/components/ui/Img";
import type { ImageAsset } from "@/types";

/** Main image + thumbnail strip; clicking the main image opens a zoomable lightbox. */
export function ProductGallery({
  images,
  active,
  onSelect,
  name,
}: {
  images: ImageAsset[];
  active: number;
  onSelect: (i: number) => void;
  name: string;
}) {
  const [zoom, setZoom] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const current = images[active] ?? images[0] ?? null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white dark:bg-[#3e3329]">
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={`Zoom ${name} image`}
        className="relative rounded-2xl overflow-hidden aspect-square flex items-center justify-center cursor-zoom-in group"
      >
        <span className="relative w-full h-full block">
          <Img asset={current} alt={`${name} - image ${active + 1}`} fill priority sizes="(max-width: 768px) 90vw, (max-width: 1280px) 45vw, 600px" className="object-contain transition-all duration-300 mt-[10px]" />
        </span>
        <span className="absolute inset-0 z-10 rounded-2xl flex items-center justify-center pointer-events-none">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/80 dark:bg-black/50 rounded-full p-2 shadow">
            <ZoomInIcon className="text-gray-600 dark:text-gray-300" />
          </span>
        </span>
      </button>

      {images.length > 1 && (
        <div className="relative">
          <div ref={strip} className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-5 lg:pb-0">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Product image ${i + 1}`}
                aria-current={i === active}
                onClick={() => onSelect(i)}
                className={
                  "shrink-0 snap-start w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 bg-gray-50 flex items-center justify-center " +
                  (i === active ? "border-orange-500 shadow" : "border-gray-200 hover:border-gray-300")
                }
              >
                <span className="relative w-4/5 h-4/5">
                  <Img asset={img} alt={`Thumb ${i + 1}`} fill sizes="80px" className="object-contain" />
                </span>
              </button>
            ))}
          </div>
          {images.length > 6 && (
            <button
              type="button"
              aria-label="More images"
              onClick={() => strip.current?.scrollBy({ left: 240, behavior: "smooth" })}
              className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow border border-gray-200 items-center justify-center text-gray-700"
            >
              <ChevronRightBoldIcon />
            </button>
          )}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[100001] bg-black/90 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`${name} images`} onClick={() => setZoom(false)}>
          <button type="button" aria-label="Close" className="absolute top-4 right-5 text-white text-3xl leading-none" onClick={() => setZoom(false)}>
            ×
          </button>
          <div className="relative w-[min(92vw,900px)] h-[min(80vh,900px)] bg-white rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <Img asset={current} alt={name} fill sizes="900px" className="object-contain p-4" />
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show image ${i + 1}`}
                  onClick={() => onSelect(i)}
                  className={"w-2.5 h-2.5 rounded-full " + (i === active ? "bg-white" : "bg-white/40")}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
