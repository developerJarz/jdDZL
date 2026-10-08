import type { Metadata } from "next";
import { Checkout } from "@/components/cart/Checkout";
export const metadata: Metadata = {
  title: "Checkout | Dazzle",
  robots: { index: false },
};
export default function CheckoutPage() {
  return <Checkout />;
}
