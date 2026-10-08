import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/listing/ListingView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ListingSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata } from "@/lib/seo";
import { getBrandListing, getBrands } from "@/services/catalog";
import { getPageMeta } from "@/services/content";
import { topSellingSlot } from "@/services/slots";

export async function generateStaticParams() {
  return (await getBrands()).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/brands/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [data, meta] = await Promise.all([getBrandListing(slug), getPageMeta(`/brands/${slug}`)]);
  if (!data) return {};
  return buildMetadata({
    title: meta?.title || `${data.brand.name} Price in Bangladesh`,
    description: meta?.description,
    keywords: meta?.keywords,
    path: `/brands/${slug}`,
    image: data.brand.logo?.src,
  });
}

export default function BrandPage({ params }: PageProps<"/brands/[slug]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/brands/[slug]">["params"] }) {
  const { slug } = await params;
  const data = await getBrandListing(slug);
  if (!data) notFound();
  const { brand, categories, listing } = data;

  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="flex flex-col flex-1 max-w-355 mx-auto">
        <div className="md:px-12.5 px-4">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Brands", href: "/brands" }, { label: brand.name }]} />
          <h1 className="sr-only">{brand.name} products</h1>
        </div>
        <ListingView
          title={brand.name}
          products={listing.products}
          categoryChips={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          attributes={listing.attributes}
          price={listing.price}
          topSelling={topSellingSlot(listing.products)}
          descriptionHtml={listing.descriptionHtml}
          emptyMessage={`No ${brand.name} products in the offline catalogue yet.`}
        />
      </div>
    </div>
  );
}
