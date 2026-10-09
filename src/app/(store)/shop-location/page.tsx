import type { Metadata } from "next";
import Link from "next/link";
import { StoreList } from "@/components/stores/StoreList";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { buildMetadata } from "@/lib/seo";
import { getPageMeta, getStores } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ ...(await getPageMeta("/shop-location")), path: "/shop-location" });
}

export default async function ShopLocationPage() {
  const { items, districts } = await getStores();
  return (
    <div className="pb-10">
      <div className="max-w-355 mx-auto">
        <div className="md:px-12.5 px-4">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
          <h1 className="lg:text-[32px] text-[20px] font-bold pb-3 text-gray-900 dark:text-white">Contact and collection information</h1>
        </div>
      </div>
      {items.length ? <StoreList stores={items} districts={districts.length ? districts : [{ label: "All", districtId: null, storeSlugs: [] }]} /> : (
        <div className="max-w-355 mx-auto px-4 md:px-12.5 py-8 text-gray-700 dark:text-gray-200">
          <p className="max-w-2xl leading-relaxed">Please confirm any collection arrangements before travelling. Use Support to ask about your order or a particular product.</p>
          <Link href="/support" className="mt-5 inline-block rounded-xl bg-[#222] px-5 py-3 text-sm font-semibold text-white">Contact dazzle.bd</Link>
        </div>
      )}
    </div>
  );
}
