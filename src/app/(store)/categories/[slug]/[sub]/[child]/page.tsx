import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/listing/ListingView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { buildMetadata } from "@/lib/seo";
import { getChildCategoryListing } from "@/services/catalog";

type Params = Promise<{ slug: string; sub: string; child: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, sub, child } = await params;
  const data = await getChildCategoryListing(slug, sub, child);
  if (!data) return {};
  return buildMetadata({ title: `${data.child.name} - ${data.subCategory.name}`, path: `/categories/${slug}/${sub}/${child}` });
}

export default async function ChildCategoryPage({ params }: { params: Params }) {
  const { slug, sub, child } = await params;
  const data = await getChildCategoryListing(slug, sub, child);
  if (!data) notFound();
  const { category, subCategory, listing } = data;
  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="flex flex-col flex-1 max-w-355 mx-auto">
        <div className="md:px-12.5 px-4">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: category.name, href: `/categories/${category.slug}` },
              { label: subCategory.name, href: `/categories/${category.slug}/${subCategory.slug}` },
              { label: data.child.name },
            ]}
          />
          <h1 className="sr-only">
            {data.child.name} — {subCategory.name}
          </h1>
        </div>
        <ListingView
          title={data.child.name}
          products={listing.products}
          brands={listing.brands.map((b) => ({ slug: b.slug, name: b.name }))}
          attributes={listing.attributes}
          price={listing.price}
          banners={[]}
          descriptionHtml=""
          emptyMessage={`No ${data.child.name} products yet.`}
        />
      </div>
    </div>
  );
}
