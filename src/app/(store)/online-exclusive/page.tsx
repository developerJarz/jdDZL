import type { Metadata } from "next";
import { ShowcaseGrid } from "@/components/listing/ShowcaseGrid";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta } from "@/services/content";
import { getOnlineExclusive } from "@/services/catalog";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/online-exclusive")), path: "/online-exclusive" });
}

export default async function OnlinePicksPage() {
  const products = await getOnlineExclusive();
  return (
    <div className="max-w-355 mx-auto px-4 py-8 pb-14">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">A few online picks for your shortlist</h1>
      <p className="mt-3 mb-7 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">Explore available products with listed price reductions. Check the selected option and review delivery charges at checkout.</p>
      <ShowcaseGrid products={products} />
    </div>
  );
}
