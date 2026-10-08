import type { Metadata } from "next";
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
          <h1 className="lg:text-[32px] text-[20px] font-bold pb-3 text-gray-900 dark:text-white">Store Locations</h1>
        </div>
      </div>
      <StoreList stores={items} districts={districts.length ? districts : [{ label: "All", districtId: null, storeSlugs: [] }]} />
    </div>
  );
}
