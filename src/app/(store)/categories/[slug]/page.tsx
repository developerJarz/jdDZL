import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/listing/ListingView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ListingSkeleton } from "@/components/ui/Skeletons";
import { buildMetadata } from "@/lib/seo";
import { getCategories, getCategory, getCategoryListing } from "@/services/catalog";
import { getPageMeta } from "@/services/content";
import { topSellingSlot, trendingSlot } from "@/services/slots";

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [category, meta] = await Promise.all([getCategory(slug), getPageMeta(`/categories/${slug}`)]);
  if (!category) return {};
  return buildMetadata({ title: meta?.title || `${category.name} Price in Bangladesh`, description: meta?.description, keywords: meta?.keywords, path: `/categories/${slug}` });
}

export default function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/categories/[slug]">["params"] }) {
  const { slug } = await params;
  const [category, listing] = await Promise.all([getCategory(slug), getCategoryListing(slug)]);
  if (!category || !listing) notFound();
  const top = topSellingSlot(listing.products);
  const trending = trendingSlot(listing.products, top);

  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="flex flex-col flex-1 max-w-355 mx-auto">
        <div className="md:px-12.5 px-4">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Categories", href: "/categories" }, { label: category.name }]} />
          <h1 className="sr-only">{category.name}</h1>
        </div>
        <ListingView
          title={category.slug.replace(/-/g, " ")}
          products={listing.products}
          brands={listing.brands.map((b) => ({ slug: b.slug, name: b.name }))}
          attributes={listing.attributes}
          price={listing.price}
          topSelling={top}
          trending={trending}
          descriptionHtml={listing.descriptionHtml}
        />
      </div>
    </div>
  );
}
