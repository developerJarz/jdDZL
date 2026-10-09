import { after } from "next/server";
import type { Document } from "mongodb";
import { z } from "zod";
import { db } from "./db";
import { requireUser, user } from "./auth";
import { body, HttpError, json, rateLimit } from "./http";
import { checkoutSchema } from "./schemas";
import { draftSchema, quickOrderSchema } from "./ops-schemas";
import { createOrder } from "./orders";
import { advanceFor } from "./pricing";
import { getStoreSettings } from "./integrations/config";
import { enabledGateways, startPayment, type Gateway } from "./integrations/payments";
import { assertNotBlocked, clientIp } from "./integrations/fraud";
import { clientContext, trackPurchase } from "./integrations/pixel";
import { orderSideEffects } from "./admin-ops";
import { customerOrderView } from "@/lib/customer-order";

const origin = (request: Request) => process.env.APP_ORIGIN || new URL(request.url).origin;

/** Pixel + SMS + stock alerts + clearing the abandoned-checkout record, after responding. */
function afterOrder(request: Request, order: Document) {
  const context = clientContext(request);
  orderSideEffects(order, "placed");
  after(async () => {
    try {
      await trackPurchase(order, context);
      if (order.idempotencyKey) await (await db()).collection("incompleteOrders").updateOne({ key: order.idempotencyKey }, { $set: { status: "converted", orderNo: order.orderNo, updatedAt: new Date() } });
    } catch (error) {
      console.error(JSON.stringify({ level: "error", task: "after-order", message: (error as Error).message }));
    }
  });
}

export async function publicApi(request: Request, path: string[]): Promise<Response | null> {
  const route = path.join("/");
  const method = request.method;

  if (method === "GET" && route === "checkout/options") {
    const store = await getStoreSettings();
    return json({
      pickupEnabled: store.pickupEnabled,
      address: store.address,
      shippingFee: store.shippingFee,
      outsideDhakaFee: store.outsideDhakaFee,
      freeShippingAbove: store.freeShippingAbove,
      zones: store.shippingZones,
      gateways: await enabledGateways(),
      partialPayment: store.partialPayment,
    });
  }

  // Abandoned-checkout capture: saved while the customer types, cleared when they order.
  if (method === "POST" && route === "checkout/draft") {
    await rateLimit(request, "draft", 30);
    const data = draftSchema.parse(await body(request));
    if (data.customer.phone.replace(/\D/g, "").length < 11 || !data.items.length) return json({ ok: true, saved: false });
    const current = await user().catch(() => null);
    const database = await db();
    const products = await database.collection("products").find({ slug: { $in: data.items.map((i) => i.slug) } }, { projection: { slug: 1, name: 1, price: 1, image: 1 } }).toArray();
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const items = data.items.filter((i) => bySlug.has(i.slug)).map((i) => ({ ...i, name: bySlug.get(i.slug)!.name, price: bySlug.get(i.slug)!.price, image: bySlug.get(i.slug)!.image }));
    await database.collection("incompleteOrders").updateOne(
      { key: data.key, status: { $ne: "converted" } },
      {
        $set: { customer: data.customer, items, value: items.reduce((s, i) => s + i.price * i.qty, 0), source: data.source, userId: current?._id.toString() ?? null, ip: clientIp(request), updatedAt: new Date() },
        $setOnInsert: { status: "new", createdAt: new Date() },
      },
      { upsert: true },
    );
    return json({ ok: true, saved: true });
  }

  if (method === "POST" && route === "orders") {
    const current = await requireUser();
    await rateLimit(request, "checkout", 15);
    const input = checkoutSchema.parse(await body(request));
    await assertNotBlocked(request, input.customer.phone);
    const store = await getStoreSettings();
    const gateways = await enabledGateways();
    const online = input.paymentMethod !== "cod" ? (input.paymentMethod as Gateway) : null;
    if (online && !gateways.includes(online)) throw new HttpError(400, "That payment method is not available.");
    // A configured advance applies to cash-on-delivery orders when a gateway can take it.
    const advanceGateway = !online && store.partialPayment.enabled && gateways.length ? (input.advanceGateway && gateways.includes(input.advanceGateway) ? input.advanceGateway : gateways[0]) : null;
    const created = await createOrder(input, current._id.toString(), { channel: "web", ip: clientIp(request) });
    const fresh = !("replayed" in created);
    const advance = advanceGateway ? advanceFor(store.partialPayment, { total: created.total, shipping: created.shipping }) : 0;
    let order = created;
    if (fresh) {
      await (await db()).collection("orders").updateOne({ _id: created._id }, { $set: { advanceRequired: advance } });
      order = { ...created, advanceRequired: advance };
      afterOrder(request, order);
    }
    const amount = online ? order.total - (order.paidAmount ?? 0) : advance;
    const gateway = online ?? advanceGateway;
    let paymentUrl: string | null = null;
    let paymentError = "";
    if (gateway && amount > 0 && order.paymentStatus !== "paid") {
      try {
        paymentUrl = await startPayment(gateway, order, amount, origin(request));
      } catch (error) {
        paymentError = (error as Error).message;
      }
    }
    return json({ ok: true, order: customerOrderView(order), paymentUrl, paymentError }, 201);
  }

  // Customers can retry an unpaid online payment / advance from their account.
  if (method === "POST" && route === "payments/start") {
    const current = await requireUser();
    const { orderNo, gateway } = z.object({ orderNo: z.string().max(60), gateway: z.enum(["bkash", "nagad", "surjopay"]) }).parse(await body(request));
    const order = await (await db()).collection("orders").findOne({ orderNo, userId: current._id.toString() });
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.status === "cancelled" || order.paymentStatus === "paid") throw new HttpError(409, "This order doesn't need a payment.");
    const due = order.total - (order.paidAmount ?? 0);
    const advanceDue = Math.max(0, (order.advanceRequired ?? 0) - (order.paidAmount ?? 0));
    const amount = order.paymentMethod === "cash-on-delivery" && advanceDue > 0 ? advanceDue : due;
    return json({ ok: true, paymentUrl: await startPayment(gateway, order, amount, origin(request)) });
  }

  // Landing-page quick order (guest, cash on delivery).
  if (method === "POST" && path[0] === "landing" && path[2] === "order") {
    await rateLimit(request, "quick-order", 8);
    const database = await db();
    const page = await database.collection("landingPages").findOne({ slug: path[1], active: { $ne: false } });
    if (!page) throw new HttpError(404, "This offer is no longer available.");
    const data = quickOrderSchema.parse(await body(request));
    if (data.items.some((i) => !(page.productSlugs as string[]).includes(i.slug))) throw new HttpError(400, "Choose a product from this offer.");
    await assertNotBlocked(request, data.phone);
    const order = await createOrder(
      {
        customer: { name: data.name, phone: data.phone, email: "", address: data.address, city: data.city || "Bangladesh" },
        items: data.items,
        coupon: "",
        delivery: "delivery",
        note: data.note,
        idempotencyKey: data.idempotencyKey,
        zone: data.zone,
        paymentMethod: "cod",
      },
      "guest",
      { channel: "landing", ip: clientIp(request), landingPage: page.slug },
    );
    afterOrder(request, order);
    return json({ ok: true, order: { orderNo: order.orderNo, total: order.total, shipping: order.shipping, customer: { name: order.customer.name } } }, 201);
  }

  return null;
}
