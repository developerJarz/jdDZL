import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CompareView } from "@/components/product/CompareView";
import { PageSkeleton } from "@/components/ui/Skeletons";
import { getAllProductSlugs, getProduct } from "@/services/products";

export async function generateStaticParams() {
  return (await getAllProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/product-compare/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product ? `Compare ${product.name} | Dazzle` : "Product Compare | Dazzle", robots: { index: false } };
}

export default function ComparePage({ params }: PageProps<"/product-compare/[slug]">) {
  return (
    <div className="bg-[#f8f9fb] dark:bg-[#2e2b28] min-h-[60vh]">
      <div className="max-w-355 mx-auto px-4 md:px-14 py-12">
        <Suspense fallback={<PageSkeleton />}>
          <Compare params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Compare({ params }: { params: PageProps<"/product-compare/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return (
    <>
      <div className="flex items-baseline justify-center gap-2 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Product Compare</h1>
        <span className="text-xs text-gray-400">up to 6 products</span>
      </div>
      <CompareView initial={product} />
    </>
  );
}
