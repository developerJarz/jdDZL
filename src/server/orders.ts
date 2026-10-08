import { randomBytes } from "node:crypto";
import { ObjectId, type ClientSession, type Document } from "mongodb";
import { checkoutSchema } from "./schemas";
import { db, mongo } from "./db";
import { HttpError } from "./http";
import { discountFor, shippingFor, transitions } from "./pricing";
import { getCarePlans } from "@/services/productServices";
import type { Product } from "@/types";
import type { z } from "zod";

type Checkout = z.infer<typeof checkoutSchema>;
type QuoteInput = Pick<Checkout, "items" | "coupon"> &
  Partial<Pick<Checkout, "delivery" | "city" | "zone">> & {
    /** Admin/POS: unit price per line index, replacing the catalog price. */
    priceOverrides?: (number | undefined)[];
    /** Admin/POS: explicit delivery charge. */
    shippingOverride?: number;
    /** Admin/POS: explicit discount instead of a coupon. */
    discountOverride?: number;
    /** Admin edit: stock already held by this order, per "slug|variant" key. */
    held?: Map<string, number>;
  };

export interface OrderLine {
  slug: string;
  name: string;
  image: unknown;
  price: number;
  unitPrice: number;
  qty: number;
  variant: string;
  sku?: string;
  extras: { label: string; price: number }[];
  /** Purchase cost per unit at order time, for profit reports (null when unknown). */
  cost: number | null;
}

export const stockKey = (slug: string, variant = "") => `${slug}|${variant}`;

/** The tracked variant row matching a cart label like "Black / 128GB". */
export function findVariant(product: Document, label: string) {
  if (!product.trackVariants) return null;
  const rows = (product.variantStock ?? []) as { key: string; stock: number; price?: number | null; sku?: string; cost?: number | null }[];
  return rows.find((v) => v.key.toLowerCase() === label.trim().toLowerCase()) ?? null;
}

export async function quote(input: QuoteInput, session?: ClientSession) {
  const database = await db();
  const lines: OrderLine[] = [];
  let subtotal = 0;
  let allFreeShipping = input.items.length > 0;
  for (const [index, item] of input.items.entries()) {
    const product = await database.collection("products").findOne({ slug: item.slug, active: { $ne: false } }, { session });
    if (!product || product.isTba || product.endOfLife || (product.price <= 0 && input.priceOverrides?.[index] === undefined))
      throw new HttpError(409, "A product is no longer available.");
    let variant = item.variant || "";
    const row = findVariant(product, variant);
    if (product.trackVariants && (product.variantStock ?? []).length) {
      if (!row) throw new HttpError(400, `Choose an available option for ${product.name}.`);
      variant = row.key;
    }
    const care = getCarePlans(product as unknown as Product);
    const labels = [...new Set((item.extras ?? []).map((e) => e.label))];
    const extras = labels.map((label) => {
      const plan = care.find((p) => p.title === label);
      if (!plan) throw new HttpError(400, "Invalid care plan.");
      return { label, price: plan.price };
    });
    const base = input.priceOverrides?.[index] ?? (row?.price ? row.price : product.price);
    const unitPrice = base + extras.reduce((sum, e) => sum + e.price, 0);
    subtotal += Math.round(unitPrice * item.qty);
    if (!product.freeShipping) allFreeShipping = false;
    lines.push({
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: base,
      unitPrice,
      qty: item.qty,
      variant,
      sku: row?.sku || product.code,
      extras,
      cost: row?.cost ?? product.costPrice ?? null,
    });
  }
  // Stock check per product and per tracked variant; stock this order already holds counts.
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(stockKey(line.slug), (quantities.get(stockKey(line.slug)) || 0) + line.qty);
    if (line.variant) quantities.set(stockKey(line.slug, line.variant), (quantities.get(stockKey(line.slug, line.variant)) || 0) + line.qty);
  }
  for (const [key, quantity] of quantities) {
    const [slug, variant] = key.split("|");
    const product = await database.collection("products").findOne({ slug }, { session });
    const available = (variant ? (findVariant(product ?? {}, variant)?.stock ?? (product?.trackVariants ? 0 : Infinity)) : (product?.stock ?? 0)) + (input.held?.get(key) ?? 0);
    if (!product || available < quantity) throw new HttpError(409, `Insufficient inventory for ${product?.name || slug}${variant ? ` (${variant})` : ""}.`);
  }
  let discount = 0;
  let couponFreeShipping = false;
  if (input.discountOverride !== undefined) discount = Math.min(subtotal, Math.max(0, Math.round(input.discountOverride)));
  else if (input.coupon) {
    const coupon = await database.collection("coupons").findOne({ code: input.coupon.trim().toUpperCase() }, { session });
    if (!coupon) throw new HttpError(400, "Coupon not found.");
    if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit) throw new HttpError(400, "This coupon has reached its usage limit.");
    try {
      discount = discountFor(subtotal, coupon as unknown as Parameters<typeof discountFor>[1]);
    } catch (error) {
      throw new HttpError(400, (error as Error).message);
    }
    couponFreeShipping = Boolean(coupon.freeShipping);
  }
  const settings = await database.collection("settings").findOne({ key: "store" }, { session });
  if (input.delivery === "pickup" && !settings?.pickupEnabled) throw new HttpError(400, "Store pickup is not available.");
  const zones = (settings?.shippingZones ?? []) as { id: string; name: string; fee: number }[];
  if (zones.length && input.delivery !== "pickup" && input.shippingOverride === undefined && input.zone && !zones.some((z) => z.id === input.zone))
    throw new HttpError(400, "Choose a delivery area.");
  const shipping =
    input.shippingOverride !== undefined
      ? Math.max(0, Math.round(input.shippingOverride))
      : shippingFor({
          subtotal: subtotal - discount,
          pickup: input.delivery === "pickup",
          city: input.city,
          zone: zones.find((z) => z.id === input.zone),
          freeAbove: settings?.freeShippingAbove ?? 0,
          insideFee: settings?.shippingFee ?? 120,
          outsideFee: settings?.outsideDhakaFee ?? settings?.shippingFee ?? 120,
          free: allFreeShipping || couponFreeShipping,
        });
  return { lines, subtotal, discount, shipping, total: subtotal - discount + shipping };
}

/* ---------------- Stock helpers (call inside a transaction) ---------------- */
async function moveStock(
  line: { slug: string; qty: number; variant?: string },
  delta: number,
  reason: string,
  actorId: string,
  session: ClientSession,
) {
  const database = await db();
  const products = database.collection("products");
  const product = await products.findOne({ slug: line.slug }, { session });
  if (!product) {
    if (delta < 0) throw new HttpError(409, "A product is no longer available.");
    return;
  }
  const row = line.variant ? findVariant(product, line.variant) : null;
  const take = Math.max(0, -delta);
  const filter: Document = { slug: line.slug, stock: { $gte: take } };
  const update: Document = { $inc: { stock: delta }, $set: { updatedAt: new Date() } };
  const options: Document = { session, returnDocument: "after" };
  if (row) {
    filter.variantStock = { $elemMatch: { key: row.key, stock: { $gte: take } } };
    update.$inc["variantStock.$[v].stock"] = delta;
    options.arrayFilters = [{ "v.key": row.key }];
  }
  const result = await products.findOneAndUpdate(filter, update, options);
  if (!result) throw new HttpError(409, `Inventory changed for ${product.name}. Please review the order.`);
  await products.updateOne(
    { _id: result._id },
    { $set: { inStock: result.stock > 0 && !result.isTba && !result.endOfLife } },
    { session },
  );
  await database.collection("stockMovements").insertOne(
    {
      slug: line.slug,
      ...(row ? { variant: row.key } : {}),
      delta,
      balance: result.stock,
      reason,
      actorId,
      createdAt: new Date(),
    },
    { session },
  );
}

export const reserveStock = (line: { slug: string; qty: number; variant?: string }, reason: string, actorId: string, session: ClientSession) =>
  moveStock(line, -line.qty, reason, actorId, session);
export const releaseStock = (line: { slug: string; qty: number; variant?: string }, reason: string, actorId: string, session: ClientSession) =>
  moveStock(line, line.qty, reason, actorId, session);

export const newOrderNo = () => `DZ-${randomBytes(4).toString("hex").toUpperCase()}-${String(Date.now()).slice(-6)}`;

export interface OrderExtras {
  channel?: "web" | "landing" | "pos" | "admin";
  ip?: string | null;
  /** Amount to collect online before shipping (partial payment). */
  advance?: number;
  status?: string;
  paymentMethod?: string;
  /** Payments taken at the counter (POS) or recorded by staff. */
  payments?: { amount: number; method: string; reference: string; at: Date; actorId?: string }[];
  quote?: Omit<QuoteInput, "items" | "coupon">;
  assignedTo?: { id: string; name: string } | null;
  landingPage?: string;
}

export async function createOrder(input: Checkout, userId: string, extras: OrderExtras = {}): Promise<Document> {
  const database = await db();
  const session = (await mongo()).startSession();
  try {
    return await session.withTransaction(async () => {
      const existing = await database.collection("orders").findOne({ idempotencyKey: input.idempotencyKey, userId }, { session });
      // Idempotent retry: hand back the original order, flagged so callers skip side effects.
      if (existing) return { ...existing, replayed: true };
      const totals = await quote({ ...input, city: input.customer.city, ...extras.quote }, session);
      const orderNo = newOrderNo();
      for (const line of totals.lines) await reserveStock(line, `Order ${orderNo}`, userId, session);
      if (input.coupon && extras.quote?.discountOverride === undefined)
        await database.collection("coupons").updateOne({ code: input.coupon.trim().toUpperCase() }, { $inc: { usedCount: 1 } }, { session });
      const payments = extras.payments ?? [];
      const paid = payments.reduce((s, p) => s + p.amount, 0);
      const status = extras.status ?? "pending";
      const order = {
        _id: new ObjectId(),
        orderNo,
        userId,
        channel: extras.channel ?? "web",
        customer: input.customer,
        delivery: input.delivery,
        zone: input.zone ?? null,
        note: input.note,
        items: totals.lines,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        total: totals.total,
        coupon: input.coupon.toUpperCase(),
        paymentMethod: extras.paymentMethod ?? (input.paymentMethod && input.paymentMethod !== "cod" ? input.paymentMethod : "cash-on-delivery"),
        paymentStatus: paid >= totals.total ? "paid" : paid > 0 ? "partial" : "unpaid",
        payments,
        paidAmount: paid,
        dueAmount: Math.max(0, totals.total - paid),
        advanceRequired: Math.min(totals.total, Math.max(0, Math.round(extras.advance ?? 0))),
        status,
        ...(extras.ip ? { ip: extras.ip } : {}),
        ...(extras.assignedTo ? { assignedTo: extras.assignedTo } : {}),
        ...(extras.landingPage ? { landingPage: extras.landingPage } : {}),
        idempotencyKey: input.idempotencyKey,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline: status === "pending" ? [{ status: "pending", at: new Date() }] : [{ status: "pending", at: new Date() }, { status, at: new Date() }],
      };
      await database.collection("orders").insertOne(order, { session });
      return order;
    });
  } finally {
    await session.endSession();
  }
}

export async function updateOrder(id: ObjectId, status: string, actorId: string, customerCancellation = false) {
  const database = await db();
  const session = (await mongo()).startSession();
  try {
    return await session.withTransaction(async () => {
      const order = await database.collection("orders").findOne({ _id: id }, { session });
      if (!order) throw new HttpError(404, "Order not found.");
      if (customerCancellation && (order.userId !== actorId || !["pending", "confirmed"].includes(order.status) || status !== "cancelled"))
        throw new HttpError(409, "Cancellation is available before your order enters processing.");
      if (!transitions[order.status]?.includes(status)) throw new HttpError(409, `Cannot change ${order.status} to ${status}.`);
      if (status === "cancelled") for (const item of order.items) await releaseStock(item, `Cancelled ${order.orderNo}`, actorId, session);
      const changes: Document = { status, updatedAt: new Date(), timeline: [...order.timeline, { status, at: new Date() }] };
      if (status === "delivered") {
        // Delivery confirms the courier/cash collection of whatever was still due.
        const paid = order.paidAmount ?? (order.paymentStatus === "paid" ? order.total : 0);
        const due = Math.max(0, order.total - paid);
        changes.paymentStatus = "paid";
        changes.paidAmount = order.total;
        changes.dueAmount = 0;
        if (due > 0)
          changes.payments = [...(order.payments ?? []), { amount: due, method: "Cash on delivery", reference: order.shipment?.trackingNumber ?? "", at: new Date(), actorId }];
      }
      await database.collection("orders").updateOne({ _id: id }, { $set: changes }, { session });
      await database.collection("audit").insertOne(
        { actorId, action: "order.status", entityId: id.toString(), detail: `${order.orderNo}: ${order.status} → ${status}`, createdAt: new Date() },
        { session },
      );
      return { ...order, ...changes };
    });
  } finally {
    await session.endSession();
  }
}

export interface OrderEdit {
  customer: Checkout["customer"];
  items: { slug: string; qty: number; variant?: string; unitPrice?: number }[];
  shipping: number;
  discount: number;
  note: string;
  zone?: string | null;
}

/**
 * Staff edit of an order that hasn't shipped: items, prices, delivery charge and discount.
 * Stock is adjusted by the difference against what the order already holds.
 */
export async function editOrder(id: ObjectId, edit: OrderEdit, actorId: string) {
  const database = await db();
  const session = (await mongo()).startSession();
  try {
    return await session.withTransaction(async () => {
      const order = await database.collection("orders").findOne({ _id: id }, { session });
      if (!order) throw new HttpError(404, "Order not found.");
      if (!["pending", "confirmed", "processing"].includes(order.status)) throw new HttpError(409, "Only orders that haven't shipped can be edited.");
      const held = new Map<string, number>();
      for (const item of order.items as OrderLine[]) {
        held.set(stockKey(item.slug), (held.get(stockKey(item.slug)) ?? 0) + item.qty);
        if (item.variant) held.set(stockKey(item.slug, item.variant), (held.get(stockKey(item.slug, item.variant)) ?? 0) + item.qty);
      }
      const totals = await quote(
        {
          items: edit.items.map((i) => ({ slug: i.slug, qty: i.qty, variant: i.variant })),
          coupon: "",
          priceOverrides: edit.items.map((i) => i.unitPrice),
          shippingOverride: edit.shipping,
          discountOverride: edit.discount,
          held,
        },
        session,
      );
      // Release everything previously held, then reserve the new lines (net effect = diff).
      const before = new Map<string, { slug: string; variant: string; qty: number }>();
      for (const i of order.items as OrderLine[]) {
        const k = stockKey(i.slug, i.variant);
        before.set(k, { slug: i.slug, variant: i.variant, qty: (before.get(k)?.qty ?? 0) + i.qty });
      }
      const after = new Map<string, { slug: string; variant: string; qty: number }>();
      for (const i of totals.lines) {
        const k = stockKey(i.slug, i.variant);
        after.set(k, { slug: i.slug, variant: i.variant, qty: (after.get(k)?.qty ?? 0) + i.qty });
      }
      for (const [k, line] of before) {
        const diff = line.qty - (after.get(k)?.qty ?? 0);
        if (diff > 0) await releaseStock({ ...line, qty: diff }, `Edited ${order.orderNo}`, actorId, session);
      }
      for (const [k, line] of after) {
        const diff = line.qty - (before.get(k)?.qty ?? 0);
        if (diff > 0) await reserveStock({ ...line, qty: diff }, `Edited ${order.orderNo}`, actorId, session);
      }
      const paid = order.paidAmount ?? 0;
      if (paid > totals.total) throw new HttpError(409, `The customer has already paid BDT ${paid}; the new total can't be lower.`);
      const changes = {
        customer: edit.customer,
        items: totals.lines,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        total: totals.total,
        note: edit.note,
        ...(edit.zone !== undefined ? { zone: edit.zone } : {}),
        dueAmount: Math.max(0, totals.total - paid),
        paymentStatus: paid <= 0 ? "unpaid" : paid >= totals.total ? "paid" : "partial",
        updatedAt: new Date(),
        timeline: [...order.timeline, { status: "edited", at: new Date() }],
      };
      await database.collection("orders").updateOne({ _id: id }, { $set: changes }, { session });
      await database.collection("audit").insertOne(
        { actorId, action: "orders.edit", entityId: id.toString(), detail: `${order.orderNo}: total ${order.total} → ${totals.total}`, createdAt: new Date() },
        { session },
      );
      return { ...order, ...changes };
    });
  } finally {
    await session.endSession();
  }
}
