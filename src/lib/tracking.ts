// Browser analytics events for Google Tag Manager (GA4 ecommerce dataLayer) and the Meta
// pixel. Both are no-ops until the store sets a GTM container / pixel ID in the dashboard.
// The Purchase event uses the order number as eventID so Meta de-duplicates it against the
// server-side Conversions API event.

type Item = { slug: string; name: string; price: number; qty: number; variant?: string };
type Win = Window & { dataLayer?: unknown[]; fbq?: (...args: unknown[]) => void };

const win = () => (typeof window === "undefined" ? null : (window as Win));
const ga4Items = (items: Item[]) => items.map((i) => ({ item_id: i.slug, item_name: i.name, price: i.price, quantity: i.qty, ...(i.variant ? { item_variant: i.variant } : {}) }));

function push(event: string, ecommerce: Record<string, unknown>) {
  const w = win();
  if (!w?.dataLayer) return;
  w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push({ event, ecommerce });
}

export function trackViewItem(item: Omit<Item, "qty">) {
  push("view_item", { currency: "BDT", value: item.price, items: ga4Items([{ ...item, qty: 1 }]) });
  win()?.fbq?.("track", "ViewContent", { content_ids: [item.slug], content_type: "product", value: item.price, currency: "BDT" });
}

export function trackAddToCart(item: Item) {
  push("add_to_cart", { currency: "BDT", value: item.price * item.qty, items: ga4Items([item]) });
  win()?.fbq?.("track", "AddToCart", { content_ids: [item.slug], content_type: "product", value: item.price * item.qty, currency: "BDT" });
}

export function trackBeginCheckout(items: Item[], value: number) {
  push("begin_checkout", { currency: "BDT", value, items: ga4Items(items) });
  win()?.fbq?.("track", "InitiateCheckout", { content_ids: items.map((i) => i.slug), num_items: items.reduce((s, i) => s + i.qty, 0), value, currency: "BDT" });
}

export function trackPurchase(order: { orderNo: string; total: number; shipping?: number; items: Item[] }) {
  push("purchase", { transaction_id: order.orderNo, currency: "BDT", value: order.total, shipping: order.shipping ?? 0, items: ga4Items(order.items) });
  win()?.fbq?.(
    "track",
    "Purchase",
    { content_ids: order.items.map((i) => i.slug), content_type: "product", value: order.total, currency: "BDT" },
    { eventID: order.orderNo },
  );
}
