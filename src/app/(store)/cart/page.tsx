import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "Shopping Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="bg-[#fffbf6] dark:bg-[#2e2b28]">
      <div className="flex flex-col flex-1 max-w-355 mx-auto">
        <div className="px-4 sm:px-6 py-4">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
          <CartView />
        </div>
      </div>
    </div>
  );
}
