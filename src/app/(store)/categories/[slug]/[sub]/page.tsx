import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/listing/ListingView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ListingSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata } from "@/lib/seo";
import { getSubCategoryListing, getSubCategoryParams } from "@/services/catalog";
import { getPageMeta } from "@/services/content";

export async function generateStaticParams() {
  return getSubCategoryParams();
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]/[sub]">): Promise<Metadata> {
  const { slug, sub } = await params;
  const [data, meta] = await Promise.all([getSubCategoryListing(slug, sub), getPageMeta(`/categories/${slug}/${sub}`)]);
  if (!data) return {};
  return buildMetadata({
    title: meta?.title || `${data.subCategory.name} - ${data.category.name}`,
    description: meta?.description,
    keywords: meta?.keywords,
    path: `/categories/${slug}/${sub}`,
  });
}

export default function SubCategoryPage({ params }: PageProps<"/categories/[slug]/[sub]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/categories/[slug]/[sub]">["params"] }) {
  const { slug, sub } = await params;
  const data = await getSubCategoryListing(slug, sub);
  if (!data) notFound();
  const { category, subCategory, banners, listing } = data;

  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="flex flex-col flex-1 max-w-355 mx-auto">
        <div className="md:px-12.5 px-4">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: category.name, href: `/categories/${category.slug}` },
              { label: subCategory.name },
            ]}
          />
          <h1 className="sr-only">
            {subCategory.name} — {category.name}
          </h1>
        </div>
        <ListingView
          title={subCategory.name}
          products={listing.products}
          brands={listing.brands.map((b) => ({ slug: b.slug, name: b.name }))}
          attributes={listing.attributes}
          price={listing.price}
          banners={banners}
          descriptionHtml={listing.descriptionHtml}
          emptyMessage={`No ${subCategory.name} products in the offline catalogue yet.`}
        />
      </div>
    </div>
  );
}
