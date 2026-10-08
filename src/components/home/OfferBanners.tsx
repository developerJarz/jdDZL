import Link from "next/link";
import { Carousel } from "@/components/ui/Carousel";
import { Img } from "@/components/ui/Img";
import { cn } from "@/lib/format";
import type { Banner } from "@/types";

function BannerLink({ banner, children, className }: { banner: Banner; children: React.ReactNode; className?: string }) {
  return (
    <Link href={banner.href} target={banner.newTab ? "_blank" : undefined} className={className} aria-label="Offer banner">
      {children}
    </Link>
  );
}

/** Two promotional banners side by side. `cover` crops to a fixed desktop height. */
export function OfferBannerPair({ banners, cover = false }: { banners: Banner[]; cover?: boolean }) {
  if (!banners.length) return null;
  return (
    <div className="flex flex-col flex-1 max-w-355 w-full mx-auto md:px-12.5 px-4">
      <div className="grid grid-cols-2 md:gap-4 gap-2 py-6">
        {banners.map((b, i) => (
          <BannerLink key={i} banner={b} className={cn("block overflow-hidden rounded-xl", cover && "lg:h-96.25")}>
            <Img
              asset={b.image}
              alt="Offer banner"
              quality={70}
              sizes="50vw"
              className={cn(
                "w-full transition-all duration-500 hover:scale-105",
                cover ? "h-full object-cover" : "h-auto hover:shadow-lg",
              )}
            />
          </BannerLink>
        ))}
      </div>
    </div>
  );
}

/** 8/4 column pair of tall banners under "Feature Products". */
export function TallBannerPair({ banners }: { banners: Banner[] }) {
  if (banners.length < 2) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 mt-6 items-stretch">
      <BannerLink banner={banners[0]} className="block sm:col-span-1 lg:col-span-8 h-[300px] md:h-[600px]">
        <Img asset={banners[0].image} alt="Offer banner" quality={70} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 66vw" className="w-full h-[300px] md:h-[600px] object-cover rounded-xl transition-all duration-500 hover:shadow-lg" />
      </BannerLink>
      <BannerLink banner={banners[1]} className="block sm:col-span-1 lg:col-span-4 h-[300px] md:h-[600px]">
        <Img asset={banners[1].image} alt="Offer banner" quality={70} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="w-full h-[300px] lg:h-[600px] object-cover rounded-xl transition-all duration-500 hover:shadow-lg" />
      </BannerLink>
    </div>
  );
}

/** Square banners under "Most Popular" (2 per view on phones, 3 on desktop). */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;
  return (
    <div className="pt-6">
      <Carousel ariaLabel="Promotions" slideClassName="w-[calc((100%-8px)/2)] lg:w-[calc((100%-20px)/3)]" gapClassName="gap-2 lg:gap-2.5" bullets={false}>
        {banners.map((b, i) => (
          <BannerLink key={i} banner={b} className="block">
            <Img asset={b.image} alt="Offer banner" quality={70} sizes="(max-width: 1023px) 50vw, 33vw" className="w-full h-auto transition-all duration-500 hover:shadow-lg" />
          </BannerLink>
        ))}
      </Carousel>
    </div>
  );
}
