import Link from "next/link";
import type { MarqueeItem } from "@/types";

/** News ticker under the header ("news-scroll" in the reference API). */
export function Marquee({ items }: { items: MarqueeItem[] }) {
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div className="relative w-full overflow-hidden select-none mb-2 py-3" aria-label="Announcements">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 sm:w-24 bg-linear-to-r from-light_bg to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 sm:w-24 bg-linear-to-l from-light_bg to-transparent" />
      <div className="flex items-center marquee-track">
        {loop.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            aria-hidden={i >= items.length ? true : undefined}
            tabIndex={i >= items.length ? -1 : undefined}
            className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-8 group whitespace-nowrap shrink-0 cursor-pointer justify-center border-r border-[#E7E7E7] dark:border-white/10"
          >
            <span className="text-primary dark:text-white font-medium text-xs sm:text-sm group-hover:font-bold tracking-wide transition-all">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
