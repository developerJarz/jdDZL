import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Img } from "@/components/ui/Img";
import { goldTitle } from "@/components/ui/Section";
import { buildMetadata } from "@/lib/seo";
import { getCategories } from "@/services/catalog";
import { getPageMeta } from "@/services/content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("/categories");
  return buildMetadata({ ...meta, path: "/categories" });
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="flex flex-col flex-1 max-w-355 mx-auto">
        <div className="md:px-12.5 px-4 pb-10">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
          <div className="flex justify-between items-center">
            <h1 className={"md:text-[32px] text-[18px] font-bold " + goldTitle}>Categories</h1>
          </div>
          <div className="py-4">
            <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {categories.map((c) => (
                <Link key={c.slug} href={`/categories/${c.slug}`} className="flex flex-col items-center group">
                  <div className="relative w-full aspect-square bg-[#F5F5F5] rounded-4xl p-6 md:p-8 transition-all duration-300 hover:scale-105 hover:bg-[#fcf5ed] hover:border-[#E9CCAE] border border-[#F5F5F5] dark:bg-[#342a20] dark:border-[#B57908]">
                    <Img asset={c.image} alt={c.name} fill sizes="(max-width: 768px) 25vw, 12vw" className="object-contain transition-transform duration-300 hover:scale-110 p-2 md:p-5" />
                  </div>
                  <h2 className="w-full text-[14px] font-medium text-primary pt-1 sm:pt-2 text-center transition-colors duration-300 group-hover:text-[#CB843B] line-clamp-2 leading-tight min-h-[22px] sm:min-h-[26px] lg:min-h-[36px] flex items-start justify-center">
                    {c.name}
                  </h2>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
