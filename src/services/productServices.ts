import type { Product } from "@/types";

// Add-on plans ("Dazzle Care") and delivery promises shown on product pages.
// The reference loads plans per product from its API (not captured by the snapshot); this
// mock reproduces the two generic gadget plans seen on the live site, priced relative to the
// product. Replace with GET /get-default-variant/:id (careProducts) when the API is wired.
export interface CarePlan {
  id: string;
  title: string;
  description?: string;
  coverage: string;
  price: number;
}

export function getCarePlans(p: Product): CarePlan[] {
  return p.price > 0 ? (p.carePlans || []) : [];
}

export const deliveryInfo = {
  express: "Delivery across Bangladesh",
  standard: "Delivery timing confirmed by the store",
  estimate: "At confirmation",
};

/** Deterministic "N people viewing" so server and client render the same number. */
export function viewersFor(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 12 + (h % 70);
}
