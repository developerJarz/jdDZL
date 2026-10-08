import { API_BASE_URL, USE_MOCK_DATA } from "./config";

// Contact / feedback / corporate / pre-order requests and order tracking all post to the
// reference backend. Without it the forms validate locally and report that submission is
// unavailable, rather than faking success.

export type FormKind = "support" | "feedback" | "corporate" | "pre-order";

export async function submitForm(kind: FormKind, data: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  if (USE_MOCK_DATA) {
    return { ok: false, message: "Your details look good, but sending requires the store's API (not configured in this build)." };
  }
  const res = await fetch(`${API_BASE_URL}/forms/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => null);
  return res?.ok ? { ok: true, message: "Thank you! We'll get back to you shortly." } : { ok: false, message: "Submission failed, please try again." };
}

export async function trackOrder(orderNo: string): Promise<{ ok: boolean; message: string }> {
  if (!/^[A-Z]{2,6}-[A-Z0-9]{3,8}-[0-9]{3,8}$/i.test(orderNo.trim())) {
    return { ok: false, message: "That doesn't look like an order number (e.g. DECO-68B43-02052)." };
  }
  if (USE_MOCK_DATA) return { ok: false, message: "Order tracking needs the order API, which isn't configured in this build." };
  const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderNo.trim())}`).catch(() => null);
  const data = await res?.json().catch(() => null);
  const order = data?.items?.[0];
  return order ? { ok: true, message: `Your order is ${order.status}. Total: BDT ${order.total}. Payment: ${order.paymentStatus}.` } : { ok: false, message: res?.status === 401 ? "Please sign in to the account that placed this order." : "No order found in your account with that number." };
}
