import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingView } from "@/components/listing/ListingView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { searchCatalog } from "@/services/search";

export const metadata: Metadata = {
  title: "Search | Dazzle",
  robots: { index: false, follow: true },
};

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  if (!q) {
    return <p className="md:px-12.5 px-4 py-16 text-center text-gray-500">Type a product, brand or category in the search box to begin.</p>;
  }
  const result = await searchCatalog(q, 1000);
  const prices = result.products.map((p) => p.price).filter((n) => n > 0);
  return (
    <ListingView
      key={q}
      title={`“${q}”`}
      products={result.products}
      brands={result.brands.map((b) => ({ slug: b.slug, name: b.name }))}
      linkChips={result.categories.map((c) => ({ label: c.name, href: `/categories/${c.slug}` }))}
      attributes={[]}
      price={{ min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 }}
      emptyMessage={`No products found for “${q}”.`}
    />
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="flex flex-col flex-1 max-w-355 mx-auto pb-10">
        <div className="md:px-12.5 px-4">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
          <h1 className="sr-only">Search results</h1>
        </div>
        <Suspense
          fallback={
            <div className="md:px-12.5 px-4 grid md:grid-cols-4 grid-cols-2 gap-4 py-6">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 dark:bg-[#2a2420] rounded-2xl h-[372px]" />
              ))}
            </div>
          }
        >
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
