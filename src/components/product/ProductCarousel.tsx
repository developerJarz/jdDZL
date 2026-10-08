import { Carousel } from "@/components/ui/Carousel";
import type { Product } from "@/types";
import { ProductCard } from "./ProductCard";

/** Two cards per view on phones, five on desktop — the reference "mySwiper" product rows. */
export function ProductCarousel({
  products,
  variant = "home",
  ariaLabel,
  autoplayMs,
  compact = false,
}: {
  products: Product[];
  variant?: "home" | "listing";
  ariaLabel?: string;
  autoplayMs?: number;
  compact?: boolean;
}) {
  return (
    <Carousel
      ariaLabel={ariaLabel}
      autoplayMs={autoplayMs}
      slideClassName="w-[calc((100%-8px)/2)] md:w-[calc((100%-20px)/3)] lg:w-[calc((100%-40px)/5)]"
      gapClassName="gap-2 md:gap-[10px]"
      trackClassName="py-2 -my-2"
      bulletsClassName="mt-6"
    >
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} variant={variant} className="h-full" compact={compact} />
      ))}
    </Carousel>
  );
}

/** Static responsive grid (2 / 3 / 5 columns). */
export function ProductGrid({
  products,
  variant = "home",
  className = "grid gap-2 md:grid-cols-3 lg:grid-cols-5 grid-cols-2",
}: {
  products: Product[];
  variant?: "home" | "listing";
  className?: string;
}) {
  return (
    <div className={className}>
      {products.map((p, i) => (
        <ProductCard key={p.slug} product={p} variant={variant} priority={i < 2} />
      ))}
    </div>
  );
}
