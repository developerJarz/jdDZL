import type { Metadata } from "next";
import { ProductReviews } from "@/components/product/ProductReviews";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Marquee } from "@/components/layout/Marquee";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductDetailView } from "@/components/product/ProductDetailView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { getSiteSettings } from "@/services/content";
import { deliveryInfo, getCarePlans } from "@/services/productServices";
import { getAllProductSlugs, getProduct, getProductDetail, getRelatedProducts } from "@/services/products";

export async function generateStaticParams() {
  return (await getAllProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, detail] = await Promise.all([getProduct(slug), getProductDetail(slug)]);
  if (!product) return {};
  return buildMetadata({
    title: detail?.seo.title || `${product.name} Price in Bangladesh`,
    description: detail?.seo.description || `Explore ${product.name} at dazzle.bd. Compare the listed price in Bangladesh, selected options and availability.`,
    keywords: detail?.seo.keywords,
    path: `/product/${slug}`,
    image: product.image?.src,
  });
}

export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <div className="min-h-screen font-sans bg-[#fffbf6] dark:bg-[#2e2b28]">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  const { slug } = await params;
  const [product, detail, site] = await Promise.all([getProduct(slug), getProductDetail(slug), getSiteSettings()]);
  if (!product) notFound();
  const related = await getRelatedProducts(product, 10);
  const phoneIntl = site.social.whatsapp?.replace(/^0/, "880");
  const facebookPage = site.social.facebook?.split("/").filter(Boolean).pop();

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: product.images.map((i) => new URL(i.src, SITE_URL).toString()),
    description: detail?.seo.description || undefined,
    sku: product.code || undefined,
    brand: product.brandName ? { "@type": "Brand", name: product.brandName } : undefined,
    offers:
      product.price > 0
        ? {
            "@type": "Offer",
            url: new URL(`/product/${slug}`, SITE_URL).toString(),
            price: String(product.price),
            priceCurrency: "BDT",
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          }
        : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-350 mx-auto lg:px-4 px-2">
        <Marquee items={site.marquee.product.length ? site.marquee.product : site.marquee.home} />
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Categories", href: "/categories" }, { label: product.name }]} />
      </div>

      <div className="max-w-350 mx-auto lg:px-4 px-2 pb-16">
        <ProductDetailView
          product={product}
          detail={detail}
          carePlans={getCarePlans(product)}
          contact={{
            phone: site.phone,
            whatsapp: phoneIntl ? `https://wa.me/${phoneIntl}` : "",
            messenger: site.social.messenger || (facebookPage ? `https://m.me/${facebookPage}` : ""),
          }}
          delivery={deliveryInfo}
          icons={{ delivery: site.assets.deliveryIcon, points: site.assets.pointsIcon, booking: site.assets.bookingIcon }}
        />

        <div className="space-y-6 mt-6">
          <div className="flex items-center gap-3" role="tablist" aria-label="Product information">
            <button type="button" role="tab" aria-selected="true" className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-[#F7F7F7] dark:bg-[#3e3329] text-gray-700 dark:text-gray-200">
              Description
            </button>
          </div>
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 scroll-mt-24" role="tabpanel">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Description</h2>
            <div className="w-full">
              {detail?.descriptionHtml ? (
                <div
                  className="cms-content dark-html-content max-w-none text-sm text-gray-800 dark:text-gray-100 p-5 bg-[#F7F7F7] dark:bg-[#1a1613] rounded-2xl border border-gray-200 dark:border-[#3a2f28] leading-relaxed overflow-x-auto [&_img]:max-w-full [&_img]:rounded-lg [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2 [&_p]:my-2"
                  dangerouslySetInnerHTML={{ __html: detail.descriptionHtml }}
                />
              ) : (
                <div className="p-5 bg-[#F7F7F7] dark:bg-[#1a1613] rounded-2xl border border-gray-200 dark:border-[#3a2f28] text-sm text-gray-600 dark:text-gray-300">
                  Contact our store team for detailed specifications and compatibility advice for this product.
                </div>
              )}
            </div>
          </div>
        </div>

        <ProductReviews slug={product.slug} />
        {related.length > 0 && (
          <section className="mt-10" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-lg font-semibold text-[#222] dark:text-white mb-4 px-4">
              Related Products
            </h2>
            <ProductCarousel products={related} ariaLabel="Related products" />
          </section>
        )}
      </div>
      {/* room for the fixed purchase bar */}
      <div className="h-24" aria-hidden="true" />
    </>
  );
}
