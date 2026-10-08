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
          aria-label={`Offer ${i + 1}`}
          draggable={false}
        >
          <Img
            asset={s.image}
            alt="Hero Banner"
            fill
            priority={i === 0}
            quality={70}
            sizes="(max-width: 767px) 100vw, (max-width: 1420px) 66vw, 936px"
            className="object-cover"
            draggable={false}
          />
        </Link>
      ))}
    </Carousel>
  );
}
