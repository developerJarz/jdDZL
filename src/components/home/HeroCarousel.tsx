import Link from "next/link";
import { Carousel } from "@/components/ui/Carousel";
import { Img } from "@/components/ui/Img";
import type { Banner } from "@/types";

/** Main banner slider: one slide on phones, 1.5 slides per view from md (as on the reference). */
export function HeroCarousel({ slides }: { slides: Banner[] }) {
  return (
    <Carousel
      ariaLabel="Featured offers"
      autoplayMs={4500}
      slideClassName="w-full md:w-[calc((100%-24px)/1.5)]"
      gapClassName="gap-6"
      bulletsClassName="mt-4"
      className="mb-[30px]"
    >
      {slides.map((s, i) => (
        <Link
          key={i}
          href={s.href}
          target={s.newTab ? "_blank" : undefined}
          className="relative block w-full h-60 max-[450px]:h-50 sm:h-75 md:h-110 rounded-[15px] overflow-hidden bg-gray-200 dark:bg-zinc-800"
          aria-label={s.headline || `Explore collection ${i + 1}`}
          draggable={false}
        >
          <Img
            asset={s.image}
            alt={s.headline ? "" : "Featured collection"}
            fill
            priority={i === 0}
            quality={70}
            sizes="(max-width: 767px) 100vw, (max-width: 1420px) 66vw, 936px"
            className="object-cover"
            draggable={false}
          />
          {s.headline && (
            <div className="absolute inset-0 flex flex-col justify-center bg-linear-to-r from-[#171d21]/95 via-[#171d21]/75 to-transparent p-5 sm:p-8 md:p-10 text-white">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-[#e9b865]">{s.eyebrow}</p>
              <h2 className="mt-3 max-w-[75%] text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">{s.headline}</h2>
              <p className="mt-3 max-w-[80%] text-xs sm:text-sm leading-relaxed text-white/85">{s.text}</p>
              <span className="mt-4 text-xs sm:text-sm font-semibold text-[#e9b865]">Explore the collection →</span>
            </div>
          )}
        </Link>
      ))}
    </Carousel>
  );
}
