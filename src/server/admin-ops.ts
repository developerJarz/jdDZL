import { after } from "next/server";
import { hash } from "bcryptjs";
import { ObjectId, type Db, type Document } from "mongodb";
import { z } from "zod";
import { db, mongo } from "./db";
import { body, HttpError, json } from "./http";
import { audit, crud, escapeRegex, oid } from "./crud";
import { orderStatus } from "./schemas";
import {
  adminOrderSchema,
  blockSchema,
  colorSchema,
  expenseSchema,
  landingSchema,
  pageSchema,
  posSaleSchema,
  postSchema,
  purchaseSchema,
  sizeSchema,
  staffSchema,
  supplierSchema,
} from "./ops-schemas";
import { createOrder, editOrder, findVariant, releaseStock, updateOrder } from "./orders";
import { getIntegrations, getStoreSettings, maskIntegrations, saveIntegrations } from "./integrations/config";
import { DEFAULT_TEMPLATES, notifyOrder, sendSms } from "./integrations/sms";
import { consignmentStatus, createConsignment, pathaoLocations, type CourierProvider } from "./integrations/courier";
import { fraudReport, phoneKey } from "./integrations/fraud";
import { enabledGateways, recordPayment } from "./integrations/payments";
import { report } from "./reports";
import { markdownToHtml } from "@/lib/markdown";

type Actor = Document & { _id: ObjectId; role: string; name?: string };

/** SMS the store owner when an order pushes products to or below their alert level. */
export async function stockAlerts(slugs: string[]) {
  const store = await getStoreSettings();
  if (!store.stockAlert.smsEnabled || !store.stockAlert.phone || !slugs.length) return;
  const low = await (await db())
    .collection("products")
    .find({ slug: { $in: slugs }, $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", store.lowStockThreshold] }] } }, { projection: { name: 1, stock: 1 } })
    .toArray();
  if (low.length)
    await sendSms(store.stockAlert.phone, `Stock alert: ${low.map((p) => `${p.name} (${p.stock} left)`).join(", ")}`.slice(0, 480), { kind: "stock-alert" });
}

/** Runs order side effects (SMS, stock alerts) after the response is sent. */
export function orderSideEffects(order: Document, event: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled" | null) {
  after(async () => {
    try {
      if (event) await notifyOrder(event, order);
      if (event === "placed" || event === null) await stockAlerts(order.items.map((i: { slug: string }) => i.slug));
    } catch (error) {
      console.error(JSON.stringify({ level: "error", task: "order-side-effects", message: (error as Error).message }));
    }
  });
}

async function receivePurchase(database: Db, purchase: Document, actorId: string) {
  const session = (await mongo()).startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of purchase.items as { slug: string; variant: string; qty: number; unitCost: number }[]) {
        const product = await database.collection("products").findOne({ slug: item.slug }, { session });
        if (!product) throw new HttpError(409, `Product ${item.slug} no longer exists.`);
        if (item.variant && product.trackVariants && !findVariant(product, item.variant)) throw new HttpError(409, `${product.name} has no variant “${item.variant}”.`);
        // Moving weighted-average cost: existing units at the old cost + received units at the new cost.
        const oldStock = Math.max(0, product.stock ?? 0);
        const oldCost = product.costPrice;
        const cost = oldCost === undefined || oldCost === null || !oldStock ? item.unitCost : (oldStock * oldCost + item.qty * item.unitCost) / (oldStock + item.qty);
        await releaseStock({ slug: item.slug, qty: item.qty, variant: item.variant }, `Purchase ${purchase.reference || purchase._id}`, actorId, session);
        await database.collection("products").updateOne({ _id: product._id }, { $set: { costPrice: Math.round(cost * 100) / 100 } }, { session });
      }
      await database.collection("purchases").updateOne({ _id: purchase._id }, { $set: { status: "received", receivedAt: new Date(), updatedAt: new Date() } }, { session });
    });
  } finally {
    await session.endSession();
  }
}

const purchaseTotals = (p: z.infer<typeof purchaseSchema>) => {
  const subtotal = p.items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const total = Math.round((subtotal + p.otherCost) * 100) / 100;
  return { subtotal, total, due: Math.max(0, total - p.paid) };
};

const OPS = new Set(["staff", "colors", "sizes", "suppliers", "purchases", "expenses", "blocklist", "fraud", "incomplete", "courier", "sms", "integrations", "pos", "landing", "pages", "posts", "reports"]);

/** Whether adminOps owns this request (decided before the body is read). */
export function handlesAdminOps(path: string[], method: string) {
  const [, resource, recordId, action] = path;
  if (OPS.has(resource)) return true;
  if (resource !== "orders") return false;
  return (
    (method === "GET" && recordId === "assignees") ||
    (method === "POST" && (recordId === "create" || recordId === "bulk" || action === "payment")) ||
    (method === "PATCH" && Boolean(recordId) && (action === "edit" || !action))
  );
}

export async function adminOps(request: Request, path: string[], current: Actor): Promise<Response | null> {
  const [, resource, recordId, action] = path;
  const method = request.method;
  const database = await db();
  const actorId = current._id.toString();
  const input = method === "POST" || method === "PATCH" ? await body(request) : undefined;
  const run = (options: Parameters<typeof crud>[0]) => crud(options, method, recordId, request, database, actorId, input);

  switch (resource) {
    /* ---------------- Staff ---------------- */
    case "staff": {
      if (current.role !== "admin") throw new HttpError(403, "Only store owners can manage staff accounts.");
      const users = database.collection("users");
      if (method === "GET")
        return json({
          items: await users.find({ role: { $in: ["admin", "staff"] } }, { projection: { passwordHash: 0 } }).sort({ role: 1, createdAt: 1 }).toArray(),
        });
      const data = staffSchema.parse(input);
      if (data.role === "admin") data.permissions = [];
      if (method === "POST") {
        if (!data.password) throw new HttpError(400, "Set a password of at least 8 characters.");
        const { password, ...rest } = data;
        const result = await users.insertOne({ ...rest, phone: rest.phone || undefined, passwordHash: await hash(password, 12), createdAt: new Date() });
        await audit(database, actorId, "staff.create", String(result.insertedId), `${data.name} (${data.role})`);
        return json({ ok: true, id: result.insertedId }, 201);
      }
      if (method === "PATCH") {
        const id = oid(recordId);
        const target = await users.findOne({ _id: id, role: { $in: ["admin", "staff"] } });
        if (!target) throw new HttpError(404, "Staff account not found.");
        if (id.equals(current._id) && (data.role !== "admin" || !data.active)) throw new HttpError(409, "You can't remove your own owner access.");
        const { password, ...rest } = data;
        await users.updateOne(
          { _id: id },
          { $set: { ...rest, ...(rest.phone ? {} : { phone: target.phone }), ...(password ? { passwordHash: await hash(password, 12) } : {}), updatedAt: new Date() } },
        );
        if (password || !data.active) await database.collection("sessions").deleteMany({ userId: id.toString() });
        await audit(database, actorId, "staff.update", recordId!, `${data.name}${password ? " · password reset" : ""}`);
        return json({ ok: true });
      }
      throw new HttpError(405, "Method not allowed.");
    }

    /* ---------------- Attributes ---------------- */
    case "colors":
      return run({ collection: "colors", schema: colorSchema, search: ["name", "hex"], sort: { name: 1 }, label: (d) => d.name });
    case "sizes":
      return run({ collection: "sizes", schema: sizeSchema, search: ["name", "group"], sort: { group: 1, sortOrder: 1, name: 1 }, label: (d) => d.name });

    /* ---------------- Suppliers & purchases ---------------- */
    case "suppliers": {
      if (method === "GET" && !recordId) {
        const params = new URL(request.url).searchParams;
        const q = params.get("q")?.trim();
        const filter = q ? { $or: ["name", "phone", "contactPerson"].map((f) => ({ [f]: { $regex: escapeRegex(q), $options: "i" } })) } : {};
        const [items, balances] = await Promise.all([
          database.collection("suppliers").find(filter).sort({ name: 1 }).toArray(),
          database
            .collection("purchases")
            .aggregate([{ $group: { _id: "$supplierId", total: { $sum: "$total" }, due: { $sum: "$due" }, count: { $sum: 1 }, last: { $max: "$date" } } }])
            .toArray(),
        ]);
        const byId = new Map(balances.map((b) => [String(b._id), b]));
        return json({ items: items.map((s) => ({ ...s, purchased: byId.get(String(s._id))?.total ?? 0, due: byId.get(String(s._id))?.due ?? 0, purchases: byId.get(String(s._id))?.count ?? 0, lastPurchase: byId.get(String(s._id))?.last ?? null })), total: items.length });
      }
      return run({
        collection: "suppliers",
        schema: supplierSchema,
        search: ["name", "phone"],
        sort: { name: 1 },
        label: (d) => d.name,
        beforeDelete: async (d, dbase) => {
          if (await dbase.collection("purchases").findOne({ supplierId: String(d._id) })) throw new HttpError(409, "This supplier has purchase history. Mark it inactive instead.");
        },
      });
    }
    case "purchases": {
      const purchases = database.collection("purchases");
      if (method === "POST" && recordId && action === "receive") {
        const purchase = await purchases.findOne({ _id: oid(recordId) });
        if (!purchase) throw new HttpError(404, "Purchase not found.");
        if (purchase.status === "received") throw new HttpError(409, "This purchase was already received.");
        await receivePurchase(database, purchase, actorId);
        await audit(database, actorId, "purchases.receive", recordId, purchase.reference || "Purchase received");
        return json({ ok: true });
      }
      if (method === "POST" && recordId && action === "pay") {
        const { amount, method: payMethod, reference } = z.object({ amount: z.number().positive().max(100_000_000), method: z.string().trim().min(1).max(40), reference: z.string().max(120).default("") }).parse(input);
        const purchase = await purchases.findOne({ _id: oid(recordId) });
        if (!purchase) throw new HttpError(404, "Purchase not found.");
        if (amount > purchase.due + 0.5) throw new HttpError(400, `Only BDT ${purchase.due} is due on this purchase.`);
        await purchases.updateOne(
          { _id: purchase._id },
          { $inc: { paid: amount, due: -amount }, $push: { payments: { amount, method: payMethod, reference, at: new Date(), actorId } } as Document, $set: { updatedAt: new Date() } },
        );
        await audit(database, actorId, "purchases.pay", recordId, `BDT ${amount} ${payMethod}`);
        return json({ ok: true });
      }
      if (method === "GET")
        return run({
          collection: "purchases",
          schema: purchaseSchema,
          search: ["reference", "note", "items.slug"],
          sort: { date: -1, _id: -1 },
          label: (d) => d.reference,
          filter: (p) => ({ ...(p.get("supplier") ? { supplierId: p.get("supplier") } : {}), ...(p.get("status") ? { status: p.get("status") } : {}) }),
        });
      if (method === "DELETE") {
        const purchase = await purchases.findOne({ _id: oid(recordId) });
        if (purchase?.status === "received") throw new HttpError(409, "Received purchases are part of your stock history and can't be deleted.");
        return run({ collection: "purchases", schema: purchaseSchema, search: [], label: (d) => d.reference || "Purchase" });
      }
      const data = purchaseSchema.parse(input);
      const products = await database.collection("products").find({ slug: { $in: data.items.map((i) => i.slug) } }, { projection: { slug: 1, name: 1 } }).toArray();
      const names = new Map(products.map((p) => [p.slug, p.name]));
      const missing = data.items.find((i) => !names.has(i.slug));
      if (missing) throw new HttpError(400, `Unknown product: ${missing.slug}`);
      const doc = {
        ...data,
        items: data.items.map((i) => ({ ...i, name: names.get(i.slug) })),
        date: new Date(data.date),
        ...purchaseTotals(data),
        payments: data.paid ? [{ amount: data.paid, method: data.paymentMethod, reference: data.reference, at: new Date(), actorId }] : [],
        status: "ordered",
      };
      if (method === "POST") {
        const result = await purchases.insertOne({ ...doc, createdAt: new Date(), updatedAt: new Date() });
        if (data.status === "received") await receivePurchase(database, { ...doc, _id: result.insertedId }, actorId);
        await audit(database, actorId, "purchases.create", String(result.insertedId), `${data.reference || "Purchase"} · BDT ${doc.total}`);
        return json({ ok: true, id: result.insertedId }, 201);
      }
      if (method === "PATCH") {
        const existing = await purchases.findOne({ _id: oid(recordId) });
        if (!existing) throw new HttpError(404, "Purchase not found.");
        if (existing.status === "received") throw new HttpError(409, "Received purchases can't be edited. Record a payment or a stock adjustment instead.");
        await purchases.updateOne({ _id: existing._id }, { $set: { ...doc, payments: existing.payments ?? doc.payments, updatedAt: new Date() } });
        if (data.status === "received") await receivePurchase(database, { ...existing, ...doc }, actorId);
        await audit(database, actorId, "purchases.update", recordId!, data.reference || "Purchase");
        return json({ ok: true });
      }
      break;
    }

    /* ---------------- Expenses ---------------- */
    case "expenses":
      return run({
        collection: "expenses",
        schema: expenseSchema,
        search: ["category", "note", "reference"],
        sort: { date: -1, _id: -1 },
        label: (d) => `${d.category} · BDT ${d.amount}`,
        prepare: (d) => ({ ...d, date: new Date(d.date) }),
        filter: (p) => ({
          ...(p.get("category") ? { category: p.get("category") } : {}),
          ...(p.get("from") || p.get("to") ? { date: { ...(p.get("from") ? { $gte: new Date(p.get("from")!) } : {}), ...(p.get("to") ? { $lte: new Date(p.get("to")!) } : {}) } } : {}),
        }),
      });

    /* ---------------- Blocklist & fraud ---------------- */
    case "blocklist":
      if (method === "POST") {
        const data = blockSchema.parse(input);
        const value = data.type === "phone" ? phoneKey(data.value) : data.value;
        if (data.type === "phone" && value.length !== 11) throw new HttpError(400, "Enter a valid mobile number.");
        if (data.type === "ip" && !/^[0-9a-f.:]{3,45}$/i.test(value)) throw new HttpError(400, "Enter a valid IP address.");
        await database.collection("blocklist").updateOne({ value }, { $set: { ...data, value, actorId, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
        await audit(database, actorId, "blocklist.add", value, data.reason || data.type);
        return json({ ok: true }, 201);
      }
      return run({ collection: "blocklist", schema: blockSchema, search: ["value", "reason"], label: (d) => d.value });
    case "fraud": {
      const phone = new URL(request.url).searchParams.get("phone") ?? "";
      return json(await fraudReport(phone));
    }

    /* ---------------- Incomplete orders ---------------- */
    case "incomplete": {
      if (method === "PATCH") {
        const { status } = z.object({ status: z.enum(["new", "contacted", "converted", "lost"]) }).parse(input);
        await database.collection("incompleteOrders").updateOne({ _id: oid(recordId) }, { $set: { status, updatedAt: new Date() } });
        return json({ ok: true });
      }
      return run({
        collection: "incompleteOrders",
        schema: z.object({}),
        search: ["customer.name", "customer.phone", "customer.address"],
        sort: { updatedAt: -1 },
        label: (d) => d.customer?.phone ?? "Draft",
        filter: (p) => (p.get("status") ? { status: p.get("status") } : { status: { $ne: "converted" } }),
      });
    }

    /* ---------------- Orders: create, edit, bulk, payments, status ---------------- */
    case "orders": {
      if (method === "GET" && recordId === "assignees")
        return json({
          items: await database
            .collection("users")
            .find({ role: { $in: ["admin", "staff"] }, active: { $ne: false } }, { projection: { name: 1, staffRole: 1, role: 1 } })
            .sort({ name: 1 })
            .toArray(),
        });
      if (method === "POST" && recordId === "create") {
        const data = adminOrderSchema.parse(input);
        // Link to an existing customer account by phone or email so they can track it.
        const customer = await database.collection("users").findOne({ role: "customer", $or: [{ phone: phoneKey(data.customer.phone) }, ...(data.customer.email ? [{ email: data.customer.email.toLowerCase() }] : [])] });
        const order = await createOrder(
          {
            customer: data.customer,
            items: data.items.map(({ slug, qty, variant }) => ({ slug, qty, variant })),
            coupon: "",
            delivery: "delivery",
            note: data.note,
            idempotencyKey: data.idempotencyKey,
            zone: data.zone ?? undefined,
            paymentMethod: "cod",
          },
          customer?._id.toString() ?? "guest",
          {
            channel: "admin",
            status: data.status,
            quote: { priceOverrides: data.items.map((i) => i.unitPrice), shippingOverride: data.shipping, discountOverride: data.discount, zone: data.zone ?? undefined },
            payments: data.payment?.amount ? [{ ...data.payment, at: new Date(), actorId }] : [],
            assignedTo: { id: actorId, name: current.name ?? "Staff" },
          },
        );
        if (order.replayed) return json({ ok: true, order }, 200);
        if (data.incompleteId) await database.collection("incompleteOrders").updateOne({ _id: oid(data.incompleteId) }, { $set: { status: "converted", orderNo: order.orderNo, updatedAt: new Date() } });
        await audit(database, actorId, "orders.create", String(order._id), `${order.orderNo} · BDT ${order.total}`);
        orderSideEffects(order, "placed");
        return json({ ok: true, order }, 201);
      }
      if (method === "POST" && recordId === "bulk") {
        const data = z
          .object({
            ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(200),
            action: z.enum(["status", "assign"]),
            status: orderStatus.optional(),
            staffId: z.string().regex(/^[a-f0-9]{24}$/i).nullable().optional(),
          })
          .parse(input);
        if (data.action === "assign") {
          const staff = data.staffId ? await database.collection("users").findOne({ _id: oid(data.staffId), role: { $in: ["admin", "staff"] } }) : null;
          if (data.staffId && !staff) throw new HttpError(400, "Staff member not found.");
          const result = await database
            .collection("orders")
            .updateMany({ _id: { $in: data.ids.map((i) => new ObjectId(i)) } }, staff ? { $set: { assignedTo: { id: String(staff._id), name: staff.name }, updatedAt: new Date() } } : { $unset: { assignedTo: "" }, $set: { updatedAt: new Date() } });
          await audit(database, actorId, "orders.assign", "bulk", `${result.modifiedCount} orders → ${staff?.name ?? "unassigned"}`);
          return json({ ok: true, affected: result.modifiedCount, failed: [] });
        }
        if (!data.status) throw new HttpError(400, "Choose a status.");
        const failed: { id: string; message: string }[] = [];
        let affected = 0;
        for (const id of data.ids) {
          try {
            const order = await updateOrder(new ObjectId(id), data.status, actorId);
            orderSideEffects(order, data.status === "pending" || data.status === "processing" ? null : data.status);
            affected++;
          } catch (error) {
            failed.push({ id, message: (error as Error).message });
          }
        }
        return json({ ok: true, affected, failed });
      }
      if (method === "PATCH" && recordId && action === "edit") {
        const data = adminOrderSchema.omit({ idempotencyKey: true, status: true, payment: true, incompleteId: true }).parse(input);
        const order = await editOrder(oid(recordId), { customer: data.customer, items: data.items, shipping: data.shipping ?? 0, discount: data.discount, note: data.note, zone: data.zone }, actorId);
        return json({ ok: true, order });
      }
      if (method === "POST" && recordId && action === "payment") {
        const data = z.object({ amount: z.number().positive().max(100_000_000), method: z.string().trim().min(1).max(40), reference: z.string().trim().max(120).default("") }).parse(input);
        const order = await recordPayment(oid(recordId), { ...data, at: new Date(), actorId });
        return json({ ok: true, order });
      }
      if (method === "PATCH" && recordId && !action) {
        const { status } = z.object({ status: orderStatus }).parse(input);
        const order = await updateOrder(oid(recordId), status, actorId);
        orderSideEffects(order, status === "pending" || status === "processing" ? null : status);
        return json({ ok: true });
      }
      return null;
    }

    /* ---------------- Courier ---------------- */
    case "courier": {
      if (method === "GET" && recordId === "pathao") {
        const params = new URL(request.url).searchParams;
        const kind = z.enum(["cities", "zones", "areas"]).parse(params.get("kind"));
        return json({ items: await pathaoLocations(kind, params.get("parent") ?? undefined) });
      }
      if (method === "POST" && recordId === "send") {
        const data = z
          .object({
            ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(100),
            provider: z.enum(["steadfast", "pathao"]),
            cityId: z.string().max(10).optional(),
            zoneId: z.string().max(10).optional(),
            areaId: z.string().max(10).optional(),
            weight: z.number().min(0.1).max(30).optional(),
            note: z.string().max(200).optional(),
          })
          .parse(input);
        const results: { orderNo: string; ok: boolean; message: string }[] = [];
        for (const id of data.ids) {
          const order = await database.collection("orders").findOne({ _id: new ObjectId(id) });
          if (!order) continue;
          if (["cancelled", "delivered", "shipped"].includes(order.status) || order.shipment?.consignmentId) {
            results.push({ orderNo: order.orderNo, ok: false, message: order.shipment?.consignmentId ? "Already booked" : `Order is ${order.status}` });
            continue;
          }
          try {
            const shipment = await createConsignment(order, data.provider as CourierProvider, data);
            await database.collection("orders").updateOne({ _id: order._id }, { $set: { shipment: { ...shipment, note: order.shipment?.note ?? "", bookedAt: new Date() }, updatedAt: new Date() } });
            await audit(database, actorId, "orders.courier", id, `${order.orderNo} → ${shipment.courier} ${shipment.consignmentId}`);
            results.push({ orderNo: order.orderNo, ok: true, message: `${shipment.courier} ${shipment.trackingNumber}` });
          } catch (error) {
            results.push({ orderNo: order.orderNo, ok: false, message: (error as Error).message });
          }
        }
        return json({ ok: true, results });
      }
      if (method === "POST" && recordId === "sync") {
        const { ids } = z.object({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(100) }).parse(input);
        const results: { orderNo: string; status: string }[] = [];
        for (const id of ids) {
          const order = await database.collection("orders").findOne({ _id: new ObjectId(id) });
          if (!order?.shipment?.consignmentId) continue;
          try {
            const status = await consignmentStatus(order.shipment);
            await database.collection("orders").updateOne({ _id: order._id }, { $set: { "shipment.status": status, "shipment.syncedAt": new Date() } });
            results.push({ orderNo: order.orderNo, status });
          } catch (error) {
            results.push({ orderNo: order.orderNo, status: (error as Error).message });
          }
        }
        return json({ ok: true, results });
      }
      break;
    }

    /* ---------------- SMS panel ---------------- */
    case "sms": {
      if (method === "GET") {
        const params = new URL(request.url).searchParams;
        const page = Math.max(1, Number(params.get("page")) || 1);
        const [items, total, sent, failed] = await Promise.all([
          database.collection("smsLogs").find().sort({ createdAt: -1 }).skip((page - 1) * 30).limit(30).toArray(),
          database.collection("smsLogs").countDocuments(),
          database.collection("smsLogs").countDocuments({ ok: true }),
          database.collection("smsLogs").countDocuments({ ok: false }),
        ]);
        const { sms } = await getIntegrations();
        return json({ items, total, page, pages: Math.max(1, Math.ceil(total / 30)), sent, failed, provider: sms.provider, defaults: DEFAULT_TEMPLATES });
      }
      if (method === "POST" && recordId === "send") {
        const data = z
          .object({
            message: z.string().trim().min(1).max(480),
            phones: z.array(z.string().max(20)).max(500).default([]),
            audience: z.enum(["", "customers", "buyers"]).default(""),
            orderNo: z.string().max(60).optional(),
          })
          .parse(input);
        let phones = data.phones;
        if (data.audience === "customers")
          phones = (await database.collection("users").find({ role: "customer", active: { $ne: false }, phone: { $type: "string" } }, { projection: { phone: 1 } }).limit(2000).toArray()).map((u) => u.phone);
        if (data.audience === "buyers") phones = (await database.collection("orders").distinct("customer.phone", { status: "delivered" })).map(String);
        const unique = [...new Set(phones.map(phoneKey).filter((p) => p.length === 11))].slice(0, 2000);
        if (!unique.length) throw new HttpError(400, "Add at least one valid mobile number.");
        let ok = 0;
        let lastError = "";
        for (const phone of unique) {
          const r = await sendSms(phone, data.message, { kind: data.orderNo ? "order.manual" : "campaign", orderNo: data.orderNo, actorId });
          if (r.ok) ok++;
          else lastError = r.message;
        }
        await audit(database, actorId, "sms.send", data.orderNo ?? "campaign", `${ok}/${unique.length} delivered`);
        return json({ ok: true, sent: ok, total: unique.length, error: lastError });
      }
      break;
    }

    /* ---------------- Integrations ---------------- */
    case "integrations": {
      if (method === "GET" && recordId === "logs")
        return json({ items: await database.collection("trackingLogs").find().sort({ createdAt: -1 }).limit(30).toArray() });
      if (method === "GET") return json({ integrations: maskIntegrations(await getIntegrations()), gateways: await enabledGateways() });
      if (method === "PATCH") {
        const saved = await saveIntegrations(input);
        await audit(database, actorId, "integrations.update", "integrations", "Integration settings updated");
        return json({ ok: true, integrations: maskIntegrations(saved), gateways: await enabledGateways() });
      }
      if (method === "POST" && recordId === "test-sms") {
        const { phone } = z.object({ phone: z.string().max(20) }).parse(input);
        return json(await sendSms(phone, "Test message from your dazzle.bd dashboard.", { kind: "test", actorId }));
      }
      break;
    }

    /* ---------------- POS ---------------- */
    case "pos": {
      if (method === "GET" && recordId === "lookup") {
        const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
        if (!code) throw new HttpError(400, "Scan or type a barcode.");
        const product = await database.collection("products").findOne({
          active: { $ne: false },
          $or: [{ barcode: code }, { code }, { "variantStock.barcode": code }, { "variantStock.sku": code }, { slug: code }],
        });
        if (!product) throw new HttpError(404, `No product with barcode ${code}.`);
        const variant = (product.variantStock ?? []).find((v: { barcode: string; sku: string }) => v.barcode === code || v.sku === code);
        return json({ product, variant: variant?.key ?? "" });
      }
      if (method === "POST" && recordId === "sale") {
        const data = posSaleSchema.parse(input);
        const store = await getStoreSettings();
        const order = await createOrder(
          {
            customer: { name: data.customer.name || "Walk-in customer", phone: data.customer.phone || store.phone, email: "", address: "Counter sale", city: "Store" },
            items: data.items.map(({ slug, qty, variant }) => ({ slug, qty, variant })),
            coupon: "",
            delivery: "delivery",
            note: data.note,
            idempotencyKey: data.idempotencyKey,
            paymentMethod: "cod",
          },
          `pos:${actorId}`,
          {
            channel: "pos",
            status: "delivered",
            paymentMethod: "pos",
            quote: { priceOverrides: data.items.map((i) => i.unitPrice), shippingOverride: 0, discountOverride: data.discount },
            assignedTo: { id: actorId, name: current.name ?? "Staff" },
          },
        );
        if (order.replayed) return json({ ok: true, order }, 200);
        // Record tenders up to the total; any extra cash is change returned at the counter.
        let remaining = order.total;
        const payments = [];
        for (const p of data.payments) {
          const amount = Math.min(remaining, p.amount);
          if (amount <= 0) continue;
          payments.push({ ...p, amount, at: new Date(), actorId });
          remaining -= amount;
        }
        const paid = order.total - remaining;
        await database.collection("orders").updateOne(
          { _id: order._id },
          { $set: { payments, paidAmount: paid, dueAmount: remaining, paymentStatus: remaining <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid" } },
        );
        await audit(database, actorId, "pos.sale", String(order._id), `${order.orderNo} · BDT ${order.total}`);
        orderSideEffects(order, null);
        return json({ ok: true, order: { ...order, payments, paidAmount: paid, dueAmount: remaining } }, 201);
      }
      break;
    }

    /* ---------------- Content: landing pages, pages, blog ---------------- */
    case "landing":
      return run({
        collection: "landingPages",
        schema: landingSchema,
        search: ["title", "slug"],
        sort: { updatedAt: -1 },
        label: (d) => d.title,
        beforeDelete: async (d, dbase) => {
          if (await dbase.collection("orders").findOne({ landingPage: d.slug })) throw new HttpError(409, "Orders came from this landing page. Unpublish it instead.");
        },
      });
    case "pages":
      return run({ collection: "pages", schema: pageSchema, search: ["title", "slug"], sort: { title: 1 }, label: (d) => d.title, prepare: (d) => ({ ...d, html: markdownToHtml(d.content) }) });
    case "posts":
      return run({
        collection: "posts",
        schema: postSchema,
        search: ["title", "slug", "category"],
        sort: { date: -1 },
        label: (d) => d.title,
        // Imported posts keep their original HTML until the body is rewritten here.
        prepare: (d) => ({ ...d, date: new Date(d.date), ...(d.content ? { contentHtml: markdownToHtml(d.content), format: "markdown" } : {}) }),
      });

    /* ---------------- Reports ---------------- */
    case "reports": {
      const params = new URL(request.url).searchParams;
      return json(await report(params));
    }
  }
  return null;
}
