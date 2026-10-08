import { Fragment } from "react";
import type { Metadata } from "next";
import { BlogCard } from "@/components/blog/BlogCard";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ClipToCart } from "@/components/home/ClipToCart";
import { FeatureStrip } from "@/components/home/FeatureStrip";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import {
  BannerCarousel,
  OfferBannerPair,
  TallBannerPair,
} from "@/components/home/OfferBanners";
import { SeoCards } from "@/components/home/SeoCards";
import { ShopByBrand } from "@/components/home/ShopByBrand";
import { TabbedProducts } from "@/components/home/TabbedProducts";
import { Marquee } from "@/components/layout/Marquee";
import {
  ProductCarousel,
  ProductGrid,
} from "@/components/product/ProductCarousel";
import { Countdown } from "@/components/ui/Countdown";
import { goldTitle, SeeAllLink } from "@/components/ui/Section";
import { buildMetadata } from "@/lib/seo";
import {
  getBrandsBySlugs,
  getCategories,
  getShowcase,
} from "@/services/catalog";
import {
  getBlogPostsBySlugs,
  getHomeContent,
  getPageMeta,
} from "@/services/content";
import { getProductsByBrand, getProductsBySlugs } from "@/services/products";
import type { Product } from "@/types";
import { sectionTitle, type HomeSectionId } from "@/lib/home-sections";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("/");
  return buildMetadata({ ...meta, path: "/" });
}

const sectionPad = "px-3 sm:px-4 md:px-6 lg:px-12";

export default async function HomePage() {
  const home = await getHomeContent();
  const [
    categories,
    flashTabs,
    newTabs,
    trending,
    bestSeller,
    hotDeal,
    featured,
    mostPopular,
    brands,
    blogs,
  ] = await Promise.all([
    getCategories(),
    Promise.all(
      home.flashSale.tabs.map(async (t) => ({
        label: t.label,
        products: await getProductsBySlugs(t.productSlugs),
      })),
    ),
    Promise.all(
      home.newArrivals.tabs.map(async (t) => ({
        label: t.label,
        products: await getProductsBySlugs(t.productSlugs),
      })),
    ),
    getShowcase("trending-now"),
    getShowcase("most-popular"),
    getProductsBySlugs(home.hotDealSlugs),
    getProductsBySlugs(home.featuredSlugs),
    getProductsBySlugs(home.mostPopularSlugs),
    getBrandsBySlugs(home.shopByBrandSlugs),
    getBlogPostsBySlugs(home.latestBlogs),
  ]);

  const homeCategories = home.categorySlugs
    .map((s) => categories.find((c) => c.slug === s))
    .filter((c) => c !== undefined)
    .map((c) => ({ slug: c.slug, name: c.name, image: c.image }));

  // "Trending Now" tabs load client-side on the reference; the mock uses the showcase lists.
  const bestValue = [...hotDeal].sort((a, b) => b.discount - a.discount);
  const trendingTabs = [
    { label: "Newest", products: trending?.products ?? [] },
    { label: "Best Seller", products: bestSeller?.products ?? [] },
    { label: "Best Value", products: bestValue },
  ].filter((t) => t.products.length);

  const productsByBrand: Record<string, Product[]> = {};
  await Promise.all(
    brands.map(
      async (b) =>
        (productsByBrand[b.slug] = await getProductsByBrand(b.slug, 10)),
    ),
  );

  const clips = (flashTabs[0]?.products ?? [])
    .slice(0, 10)
    .map((p) => ({ product: p, videoUrl: null, poster: p.image }));

  // Section order, visibility, and heading overrides come from the dashboard homepage builder.
  const titles = Object.fromEntries(
    home.sections.map((s) => [s.id, sectionTitle(s)]),
  ) as Record<HomeSectionId, string>;
  const sections: Record<HomeSectionId, () => React.ReactNode> = {
    marquee: () => (
      <>
        <div className="flex flex-col flex-1 items-center max-w-355 mx-auto">
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12">
            <Marquee items={home.marquee} />
          </div>
        </div>
      </>
    ),
    hero: () => (
      <>
        {home.heroSlides.length > 0 && (
          <div className="flex flex-col flex-1 items-center max-w-355 mx-auto">
            <div className="w-full pb-4 md:pb-6 px-4 sm:px-6 md:px-8 lg:px-12">
              <HeroCarousel slides={home.heroSlides} />
            </div>
          </div>
        )}
      </>
    ),
    categories: () => (
      <>
        <section
          className="flex flex-col flex-1 max-w-355 mx-auto"
          aria-labelledby="home-categories"
        >
          <div className="md:px-12.5 px-4">
            <div className="flex justify-between items-center">
              <h2
                id="home-categories"
                className={"md:text-[32px] text-[18px] font-bold " + goldTitle}
              >
                {titles.categories}
              </h2>
              <SeeAllLink href="/categories" />
            </div>
            <div className="py-4">
              <CategoryGrid items={homeCategories} />
            </div>
          </div>
        </section>
      </>
    ),
    flashSale: () => (
      <>
        {flashTabs.length > 0 && (
          <section className="bg-[#6D3F0E]" aria-labelledby="home-flash">
            <div className="flex flex-col flex-1 py-6 sm:py-8 md:py-10 mt-6 sm:mt-8 md:mt-10 max-w-355 mx-auto">
              <div className={sectionPad + " pb-4"}>
                <div className="w-full flex md:flex-row gap-4 lg:py-6 py-4 justify-between items-center">
                  <div className="flex md:flex-row gap-4 items-center flex-wrap">
                    <h2
                      id="home-flash"
                      className="md:text-[32px] text-[18px] font-bold text-white hover:text-[#CB843B]"
                    >
                      {titles.flashSale || home.flashSale.title}
                    </h2>
                    {home.flashSale.endsAt && (
                      <Countdown endsAt={home.flashSale.endsAt} />
                    )}
                  </div>
                  <SeeAllLink href={home.flashSale.href} label="See All" />
                </div>
                <TabbedProducts
                  tabs={flashTabs}
                  tone="dark"
                  ariaLabel={titles.flashSale || home.flashSale.title}
                />
              </div>
            </div>
          </section>
        )}
      </>
    ),
    offersAfterFlash: () => (
      <>
        <OfferBannerPair banners={home.offerBanners.afterFlashSale} />
      </>
    ),
    trending: () => (
      <>
        {trendingTabs.length > 0 && (
          <section
            className="flex flex-col flex-1 max-w-355 mx-auto"
            aria-labelledby="home-trending"
          >
            <div className={sectionPad}>
              <div className="flex items-center gap-4 sm:gap-6 pb-4 sm:pb-5 justify-between pt-4 sm:pt-6">
                <h2
                  id="home-trending"
                  className={
                    "text-[20px] sm:text-[24px] md:text-[32px] font-bold transition-colors " +
                    goldTitle
                  }
                >
                  {titles.trending}
                </h2>
                <SeeAllLink href="/trending-now" label="See All" />
              </div>
              <TabbedProducts tabs={trendingTabs} ariaLabel={titles.trending} />
            </div>
          </section>
        )}
      </>
    ),
    clipToCart: () => (
      <>
        {clips.length > 0 && (
          <section
            className="bg-[#E9CCAE] dark:bg-[#6d3f0e]"
            aria-labelledby="home-clip"
          >
            <div
              className={
                "flex flex-col flex-1 py-6 sm:py-8 md:py-10 mt-6 sm:mt-8 md:mt-10 max-w-355 mx-auto " +
                sectionPad
              }
            >
              <div className="flex justify-between items-center gap-6 pb-5">
                <h2
                  id="home-clip"
                  className="md:text-[32px] text-[20px] font-bold text-transparent bg-clip-text bg-[linear-gradient(90deg,#222222_0%,#965C20_43.27%,#693B0C_100%)] dark:text-white"
                >
                  {titles.clipToCart}
                </h2>
                <SeeAllLink href="/new-arrivals" label="See All" />
              </div>
              <ClipToCart clips={clips} />
            </div>
          </section>
        )}
      </>
    ),
    offersAfterClip: () => (
      <>
        <OfferBannerPair banners={home.offerBanners.afterClipToCart} cover />
      </>
    ),
    brands: () => (
      <>
        {brands.length > 0 && (
          <section
            className="flex flex-col flex-1 max-w-355 mx-auto"
            aria-labelledby="home-brands"
          >
            <div className="md:px-12.5 px-4">
              <div className="flex justify-between items-center mb-4">
                <h2
                  id="home-brands"
                  className={
                    "md:text-[32px] text-[20px] font-bold " + goldTitle
                  }
                >
                  {titles.brands}
                </h2>
                <SeeAllLink href="/brands" />
              </div>
              <ShopByBrand brands={brands} productsByBrand={productsByBrand} />
            </div>
          </section>
        )}
      </>
    ),
    newArrivals: () => (
      <>
        {newTabs.length > 0 && (
          <section className="bg-[#6D3F0E]" aria-labelledby="home-new">
            <div className="flex flex-col flex-1 py-6 sm:py-8 md:py-10 mt-6 sm:mt-8 md:mt-10 max-w-355 mx-auto">
              <div className={sectionPad}>
                <div className="flex items-center gap-4 sm:gap-6 pb-4 sm:pb-5 justify-between">
                  <h2
                    id="home-new"
                    className="text-[20px] sm:text-[24px] md:text-[32px] font-bold transition-colors text-white"
                  >
                    {titles.newArrivals}
                  </h2>
                  <SeeAllLink href="/new-arrivals" />
                </div>
                <TabbedProducts
                  tabs={newTabs}
                  tone="dark"
                  ariaLabel={titles.newArrivals}
                />
              </div>
            </div>
          </section>
        )}
      </>
    ),
    offersAfterNew: () => (
      <>
        <OfferBannerPair banners={home.offerBanners.afterNewArrivals} />
      </>
    ),
    mostPopular: () => (
      <>
        {mostPopular.length > 0 && (
          <section
            className="flex flex-col flex-1 max-w-355 mx-auto md:px-12.5"
            aria-labelledby="home-popular"
          >
            <div className="px-4 lg:px-0">
              <div className="flex justify-between items-center">
                <h2
                  id="home-popular"
                  className={
                    "md:text-[32px] text-[20px] font-bold transition-colors " +
                    goldTitle
                  }
                >
                  {titles.mostPopular}
                </h2>
                <SeeAllLink href="/most-popular" />
              </div>
              <ProductGrid
                products={mostPopular}
                className="grid gap-2 md:grid-cols-3 lg:grid-cols-5 grid-cols-2 mt-5"
              />
              <BannerCarousel banners={home.offerBanners.mostPopular} />
            </div>
          </section>
        )}
      </>
    ),
    hotDeal: () => (
      <>
        {hotDeal.length > 0 && (
          <section className="bg-[#222222]" aria-labelledby="home-hot">
            <div className="flex flex-col flex-1 py-6 sm:py-8 md:py-10 mt-6 sm:mt-8 md:mt-10 max-w-355 mx-auto">
              <div className={sectionPad}>
                <div className="flex items-center gap-4 sm:gap-6 pb-4 sm:pb-5 justify-between">
                  <h2
                    id="home-hot"
                    className="text-[20px] sm:text-[24px] md:text-[32px] font-bold transition-colors bg-linear-to-r from-white to-[#CB843B] text-transparent bg-clip-text"
                  >
                    {titles.hotDeal}
                  </h2>
                  <SeeAllLink href="/hot-deal" />
                </div>
                <ProductCarousel
                  products={hotDeal}
                  ariaLabel={titles.hotDeal}
                />
              </div>
            </div>
          </section>
        )}
      </>
    ),
    featured: () => (
      <>
        {featured.length > 0 && (
          <section
            className="flex flex-col flex-1 max-w-355 mx-auto md:px-12.5 px-4 mt-6 sm:mt-8 md:mt-10"
            aria-labelledby="home-featured"
          >
            <div className="flex justify-between items-center gap-6 pb-5">
              <h2
                id="home-featured"
                className={
                  "md:text-[32px] text-[20px] font-bold transition-colors " +
                  goldTitle
                }
              >
                {titles.featured}
              </h2>
              <SeeAllLink href="/feature-product" />
            </div>
            <ProductGrid products={featured} />
            <TallBannerPair banners={home.offerBanners.afterFeatured} />
          </section>
        )}
      </>
    ),
    blog: () => (
      <>
        <section
          className="flex flex-col flex-1 max-w-355 mx-auto md:px-12.5 px-4 mt-10"
          aria-labelledby="home-blog"
        >
          <div className="flex justify-between items-center gap-6 pb-5">
            <h2
              id="home-blog"
              className={
                "lg:text-[32px] text-[16px] font-bold transition-colors " +
                goldTitle
              }
            >
              {titles.blog}
            </h2>
            <SeeAllLink href="/blogs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {blogs.map((b, i) => (
              <div
                key={b.slug}
                className={
                  i === 0
                    ? "block"
                    : i === 1
                      ? "hidden sm:block"
                      : "hidden lg:block"
                }
              >
                <BlogCard post={b} />
              </div>
            ))}
          </div>
          <FeatureStrip />
          <SeoCards cards={home.seoCards} />
        </section>
      </>
    ),
  };

  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <h1 className="sr-only">
        Dazzle — Buy Mobiles, Laptops &amp; Gadgets Online in Bangladesh
      </h1>
      {home.sections
        .filter((section) => section.visible)
        .map((section) => (
          <Fragment key={section.id}>{sections[section.id]()}</Fragment>
        ))}
    </div>
  );
}
