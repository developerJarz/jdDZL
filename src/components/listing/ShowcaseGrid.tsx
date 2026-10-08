"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types";

/** "See all" product grids (5 columns) with infinite scroll. */
export function ShowcaseGrid({ products, pageSize = 20, variant = "home" }: { products: Product[]; pageSize?: number; variant?: "home" | "listing" }) {
  const [visible, setVisible] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || visible >= products.length) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setVisible((v) => v + pageSize), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, products.length, pageSize]);

  if (!products.length) return <p className="text-sm text-gray-500 dark:text-gray-400 py-6">No products available.</p>;

  return (
    <>
      <div className="grid md:grid-cols-5 grid-cols-2 lg:gap-4 gap-2">
        {products.slice(0, visible).map((p, i) => (
          <ProductCard key={p.slug} product={p} variant={variant} priority={i < 5} />
        ))}
      </div>
      <div ref={sentinel} className="h-10" aria-hidden="true" />
    </>
  );
}
