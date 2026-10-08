import type { Metadata } from "next";
import { OrderTracking } from "@/components/forms/OrderTracking";

export const metadata: Metadata = { title: "Order Tracking", robots: { index: false } };

export default function OrderTrackingPage() {
  return (
    <div className="bg-white dark:bg-[#2e2b28]">
      <div className="max-w-[1152px] mx-auto bg-[#fffbf6] dark:bg-[#2e2b28] px-4 py-10 min-h-[70vh]">
        <OrderTracking />
      </div>
    </div>
  );
}
