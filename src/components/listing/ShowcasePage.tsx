import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { goldTitle } from "@/components/ui/Section";
import type { Product } from "@/types";
import { ShowcaseGrid } from "./ShowcaseGrid";

/** Layout shared by /new-arrivals, /hot-deal, /most-popular, /trending-now, /feature-product. */
export function ShowcasePage({ crumb, title, products, variant = "home" }: { crumb: string; title: string; products: Product[]; variant?: "home" | "listing" }) {
  return (
    <div className="flex flex-col flex-1 max-w-355 mx-auto pb-10">
      <div className="md:px-12.5 px-4">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: crumb }]} />
      </div>
      <div className="mt-6 md:px-12.5 px-4">
        <h1 className={"md:text-[32px] text-[20px] font-bold mb-4 " + goldTitle}>{title}</h1>
        <ShowcaseGrid products={products} variant={variant} />
      </div>
    </div>
  );
}
