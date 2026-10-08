import type { Metadata } from "next";
import { ShowcaseGrid } from "@/components/listing/ShowcaseGrid";
import { goldTitle } from "@/components/ui/Section";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("/online-exclusive");
  return buildMetadata({ title: meta?.title && meta.title !== "Dazzle" ? meta.title : "Online Exclusive | Dazzle", path: "/online-exclusive" });
}

// The snapshot captured this page with no online-exclusive products (its banners load
// client-side and weren't mirrored), so the list stays empty — matching the reference state.
const products: never[] = [];

export default function OnlineExclusivePage() {
  return (
    <div>
      <div className="bg-[#ebebeb] dark:bg-[#2e2b28]">
        <div className="flex flex-col items-center max-w-355 mx-auto px-4">
          <div className="w-full pt-5">
            <div className="bg-black text-white flex justify-evenly items-center text-center gap-x-2 rounded-full md:rounded-xl md:max-w-3xl mx-auto py-1 md:py-2 px-3 md:px-10 font-semibold text-[10px] md:text-base my-6">
              <p>Delivery:</p>
              <p className="gradient-text">1-3 days</p>
              <span className="h-7 md:h-6 bg-gray-500 w-px" />
              <p className="gradient-text">3-7 days</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-355 mx-auto pt-6 px-4 pb-10">
        <div className="flex justify-between items-center pb-4">
          <h1 className={"md:text-[32px] text-[20px] font-bold transition-colors " + goldTitle}>Online Exclusive Products</h1>
        </div>
        <ShowcaseGrid products={products} />
      </div>
    </div>
  );
}
