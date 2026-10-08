export function discountFor(
  subtotal: number,
  coupon: {
    type: string;
    value: number;
    minOrder: number;
    active: boolean;
    expiresAt: Date;
  } | null,
  now = new Date(),
) {
  if (!coupon) return 0;
  if (!coupon.active || coupon.expiresAt <= now)
    throw new Error("This coupon has expired or is inactive.");
  if (subtotal < coupon.minOrder)
    throw new Error(
      `This coupon requires a minimum order of BDT ${coupon.minOrder}.`,
    );
  return Math.min(
    subtotal,
    Math.round(
      coupon.type === "percent"
        ? (subtotal * coupon.value) / 100
        : coupon.value,
    ),
  );
}
export const transitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Delivery charge for a basket. A configured delivery area wins over the city rule. */
export function shippingFor(o: {
  subtotal: number;
  pickup?: boolean;
  city?: string;
  zone?: { fee: number } | null;
  freeAbove: number;
  insideFee: number;
  outsideFee: number;
  /** Every item ships free, or a free-shipping coupon applies. */
  free?: boolean;
}) {
  if (o.pickup || o.free || (o.freeAbove > 0 && o.subtotal >= o.freeAbove)) return 0;
  if (o.zone) return o.zone.fee;
  return o.city && o.city.trim().toLowerCase() !== "dhaka" ? o.outsideFee : o.insideFee;
}

/** Advance a cash-on-delivery customer pays online before the order ships. */
export function advanceFor(
  rule: { enabled: boolean; type: "shipping" | "fixed" | "percent"; value: number } | undefined,
  totals: { total: number; shipping: number },
) {
  if (!rule?.enabled) return 0;
  const amount = rule.type === "shipping" ? totals.shipping : rule.type === "fixed" ? rule.value : (totals.total * rule.value) / 100;
  return Math.min(totals.total, Math.max(0, Math.round(amount)));
}
