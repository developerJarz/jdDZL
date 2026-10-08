import { db } from "../db";
import { HttpError } from "../http";

/** Last 11 digits of a Bangladesh number (01XXXXXXXXX) for matching across formats. */
export const phoneKey = (phone: string) => phone.replace(/\D/g, "").slice(-11);

export function clientIp(request: Request) {
  // Only meaningful behind a proxy that overwrites X-Forwarded-For (TRUST_PROXY=true).
  if (process.env.TRUST_PROXY !== "true") return null;
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

/** Rejects checkout/forms from blocked phone numbers or IP addresses. */
export async function assertNotBlocked(request: Request, phone?: string) {
  const ip = clientIp(request);
  const values = [...(phone ? [phoneKey(phone)] : []), ...(ip ? [ip] : [])];
  if (!values.length) return;
  const hit = await (await db()).collection("blocklist").findOne({ value: { $in: values } });
  if (hit) throw new HttpError(403, "We couldn't accept this order. Please contact the store by phone.");
}

/**
 * Delivery history for a phone number, from this store's own orders. A low success ratio
 * (many cancelled or returned orders) is the usual sign of a risky cash-on-delivery customer.
 */
export async function fraudReport(phone: string) {
  const key = phoneKey(phone);
  if (key.length !== 11) throw new HttpError(400, "Enter a valid mobile number.");
  const database = await db();
  const pattern = new RegExp(`${key.slice(1)}$`);
  const [orders, blocked] = await Promise.all([
    database
      .collection("orders")
      .find({ "customer.phone": pattern }, { projection: { orderNo: 1, status: 1, total: 1, refund: 1, createdAt: 1, channel: 1 } })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray(),
    database.collection("blocklist").findOne({ value: key }),
  ]);
  const delivered = orders.filter((o) => o.status === "delivered" && !o.refund).length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const returned = orders.filter((o) => o.refund).length;
  const finished = delivered + cancelled + returned;
  const successRate = finished ? Math.round((delivered / finished) * 100) : null;
  const risk = blocked ? "blocked" : finished < 2 ? "new" : successRate! >= 80 ? "low" : successRate! >= 50 ? "medium" : "high";
  return {
    phone: key,
    total: orders.length,
    delivered,
    cancelled,
    returned,
    open: orders.length - finished,
    successRate,
    risk,
    blocked: Boolean(blocked),
    recent: orders.slice(0, 8),
  };
}
