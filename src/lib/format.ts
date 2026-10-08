const taka = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 199990 -> "1,99,990" (South-Asian digit grouping, as on the reference site). */
export function formatPrice(value: number): string {
  return taka.format(Math.round(value));
}

/** 199990 -> "199,990" (western grouping, used by a few compact widgets on the reference). */
export function formatPlain(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatDiscount(value: number, exact = false): string {
  if (!value) return "0";
  return exact ? String(Math.round(value * 100) / 100) : String(Math.round(value));
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Monthly EMI shown on product pages (reference: price / 12, rounded). */
export function monthlyEmi(price: number, months = 12): number {
  return Math.round(price / months);
}
