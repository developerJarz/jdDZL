import { createHash } from "node:crypto";
import type { Document } from "mongodb";
import { db } from "../db";
import { getIntegrations, getStoreSettings } from "./config";
import { bdMsisdn } from "./sms";

const sha = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

/** Request context forwarded to Meta for matching (never stored beyond the log). */
export interface ClientContext {
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  url?: string;
}

export function clientContext(request: Request): ClientContext {
  const cookies = Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((p) => p.length === 2),
  );
  return {
    ip: process.env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    fbp: cookies._fbp,
    fbc: cookies._fbc,
    url: request.headers.get("referer") ?? undefined,
  };
}

/**
 * Sends a Purchase event to the Meta Conversions API. `event_id` is the order number, which
 * the storefront also passes to the browser pixel, so Meta de-duplicates the two.
 */
export async function trackPurchase(order: Document, context: ClientContext) {
  const [{ tracking }, { pixel }] = await Promise.all([getStoreSettings(), getIntegrations()]);
  if (!tracking.pixelId || !pixel.accessToken) return;
  const phone = order.customer?.phone ? bdMsisdn(order.customer.phone) : null;
  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(new Date(order.createdAt ?? Date.now()).getTime() / 1000),
        event_id: order.orderNo,
        action_source: "website",
        ...(context.url ? { event_source_url: context.url } : {}),
        user_data: {
          ...(order.customer?.email ? { em: [sha(order.customer.email)] } : {}),
          ...(phone ? { ph: [sha(phone)] } : {}),
          ...(order.customer?.name ? { fn: [sha(String(order.customer.name).split(" ")[0])] } : {}),
          ...(order.customer?.city ? { ct: [sha(String(order.customer.city).replace(/\s/g, ""))] } : {}),
          country: [sha("bd")],
          ...(context.ip ? { client_ip_address: context.ip } : {}),
          ...(context.userAgent ? { client_user_agent: context.userAgent } : {}),
          ...(context.fbp ? { fbp: context.fbp } : {}),
          ...(context.fbc ? { fbc: context.fbc } : {}),
        },
        custom_data: {
          currency: "BDT",
          value: order.total,
          order_id: order.orderNo,
          content_type: "product",
          contents: order.items.map((i: { slug: string; qty: number; unitPrice: number }) => ({ id: i.slug, quantity: i.qty, item_price: i.unitPrice })),
        },
      },
    ],
    ...(pixel.testEventCode ? { test_event_code: pixel.testEventCode } : {}),
  };
  let ok = false;
  let response = "";
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${tracking.pixelId}/events?access_token=${encodeURIComponent(pixel.accessToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    ok = res.ok;
    response = (await res.text()).slice(0, 400);
  } catch (error) {
    response = (error as Error).message;
  }
  await (await db()).collection("trackingLogs").insertOne({ event: "Purchase", orderNo: order.orderNo, ok, response, createdAt: new Date() });
}
