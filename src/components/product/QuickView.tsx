"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Img } from "@/components/ui/Img";
import { useStore } from "@/context/store";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types";

/** Product quick-view dialog opened from the eye button on product cards. */
export function QuickView({ product: p, onClose }: { product: Product; onClose: () => void }) {
  const { addToCart } = useStore();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const images = p.images.length ? p.images : p.image ? [p.image] : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${p.name} quick view`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white dark:bg-[#2e2b28] rounded-3xl shadow-2xl p-5 sm:p-8 grid sm:grid-cols-2 gap-6 outline-none cursor-default"
      >
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-4 text-2xl leading-none text-gray-400 hover:text-gray-700">
          ×
        </button>
        <div>
          <div className="relative aspect-square rounded-2xl bg-white border border-gray-100">
            <Img asset={images[active]} alt={p.name} fill sizes="(max-width: 640px) 90vw, 360px" className="object-contain p-4" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Image ${i + 1}`}
                  className={"relative w-16 h-16 shrink-0 rounded-xl border-2 bg-white " + (i === active ? "border-[#F27C2C]" : "border-gray-200")}
                >
                  <Img asset={img} alt="" fill sizes="64px" className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-[#222] dark:text-white">{p.name}</h2>
          {p.brandName && (
            <p className="text-sm text-gray-500 mt-1">
              By: <span className="text-[#B57908] font-semibold">{p.brandName}</span>
            </p>
          )}
          {p.price > 0 ? (
            <p className="mt-4 flex items-baseline gap-3">
              <span className="text-[28px] font-bold text-[#B57908]">BDT {formatPrice(p.price)}</span>
              {p.regularPrice > p.price && <span className="text-lg text-red-500 line-through">BDT {formatPrice(p.regularPrice)}</span>}
            </p>
          ) : (
            <p className="mt-4 inline-block self-start bg-[#6D3F0E] text-white text-xs font-bold px-3 py-1 rounded-full">To Be Announced</p>
          )}
          <p className={"mt-2 text-sm font-semibold " + (p.inStock ? "text-[#03A000]" : "text-red-500")}>{p.inStock ? "In Stock" : "Out of Stock"}</p>
          {p.inStock && p.price > 0 && (
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-xl">
                <button type="button" aria-label="Decrease quantity" className="w-9 h-9 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span className="w-8 text-center font-semibold dark:text-white">{qty}</span>
                <button type="button" aria-label="Increase quantity" className="w-9 h-9 text-lg" onClick={() => setQty((q) => q + 1)}>
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  addToCart({ slug: p.slug, name: p.name, image: p.image, price: p.price, regularPrice: p.regularPrice, qty });
                  onClose();
                }}
                className="flex-1 h-11 rounded-2xl bg-[#E9CCAE] text-[#222] font-semibold hover:brightness-95"
              >
                Add to cart
              </button>
            </div>
          )}
          <Link href={`/product/${p.slug}`} onClick={onClose} className="mt-auto pt-6 text-sm font-semibold text-[#CB843B] hover:underline">
            View full details →
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
