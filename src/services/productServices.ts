import type { Product } from "@/types";

// Only explicitly configured product protection plans are offered.
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
  express: "Delivery options shown at checkout",
  standard: "Delivery timing confirmed by the store",
  estimate: "At confirmation",
};
