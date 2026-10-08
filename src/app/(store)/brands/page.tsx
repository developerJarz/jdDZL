import type { Metadata } from "next";
import { BrandDirectory } from "@/components/listing/BrandDirectory";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { buildMetadata } from "@/lib/seo";
import { getBrands } from "@/services/catalog";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("/brands");
  return buildMetadata({ ...meta, path: "/brands" });
}

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="flex flex-col flex-1 max-w-355 mx-auto">
        <div className="md:px-12.5 px-4 pb-10">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />
          <h1 className="sr-only">Brands</h1>
          <BrandDirectory brands={brands.map((b) => ({ slug: b.slug, name: b.name, logo: b.logo }))} />
        </div>
      </div>
    </div>
  );
}
