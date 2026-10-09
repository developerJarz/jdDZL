import { ObjectId, type Document } from "mongodb";
import { z } from "zod";
import { db, mongo } from "./db";
import { requireUser } from "./auth";
import { body, HttpError, json, rateLimit, sameOrigin } from "./http";
import {
  addressSchema,
  bdPhone,
  ticketSchema,
  ticketTransitions,
} from "./customer-schemas";
import { updateOrder } from "./orders";
import { createHash, randomBytes } from "node:crypto";
import { customerOrderView } from "@/lib/customer-order";

const oid = (v: string) => {
  if (!/^[a-f0-9]{24}$/i.test(v || ""))
    throw new HttpError(400, "Invalid record ID.");
  return new ObjectId(v);
};
const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export async function customerApi(request: Request, path: string[]) {
  const admin = path[0] === "admin";
  const route = admin ? path.slice(2) : path.slice(1);
  const method = request.method;
  if (method !== "GET") sameOrigin(request);
  const current = await requireUser(admin);
  const database = await db();
  const userId = current._id.toString();
  const audit = async (action: string, entityId: string, detail: string) =>
    database
      .collection("audit")
      .insertOne({
        action,
        entityId,
        detail,
        actorId: userId,
        createdAt: new Date(),
      });
  if (method === "GET") {
    if (!admin && route[0] === "wishlist")
      return json({
        items: await database
          .collection("products")
          .find(
            { slug: { $in: current.wishlist || [] }, active: { $ne: false } },
            { projection: { slug: 1, name: 1, image: 1, price: 1 } },
          )
          .toArray(),
      });
    if (!admin && route[0] === "dashboard") {
      const [orders, tickets, wishlist] = await Promise.all([
        database
          .collection("orders")
          .find({ userId })
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray(),
        database
          .collection("tickets")
          .find({ userId })
          .sort({ updatedAt: -1 })
          .limit(100)
          .toArray(),
        database
          .collection("products")
          .find(
            { slug: { $in: current.wishlist || [] }, active: { $ne: false } },
            {
              projection: { slug: 1, name: 1, image: 1, price: 1, inStock: 1 },
            },
          )
          .toArray(),
      ]);
      return json({
        profile: {
          name: current.name,
          email: current.email,
          phone: current.phone,
          addresses: current.addresses || [],
        },
        orders: orders.map(customerOrderView),
        tickets,
        wishlist,
      });
    }
    if (admin && route[0] === "customers" && route[1]) {
      const customer = await database
        .collection("users")
        .findOne(
          { _id: oid(route[1]), role: "customer" },
          { projection: { passwordHash: 0 } },
        );
      if (!customer) throw new HttpError(404, "Customer not found.");
      const [orders, tickets] = await Promise.all([
        database
          .collection("orders")
          .find({ userId: route[1] })
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray(),
        database
          .collection("tickets")
          .find({ userId: route[1] })
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray(),
      ]);
      return json({ customer, orders, tickets });
    }
    if (admin && ["tickets", "stock", "reviews"].includes(route[0])) {
      const params = new URL(request.url).searchParams;
      const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
      const filter: Document = {};
      const q = params.get("q")?.trim().slice(0, 100);
      if (q)
        filter.$or = [
          "subject",
          "orderNo",
          "customerName",
          "slug",
          "reason",
          "comment",
        ].map((f) => ({ [f]: { $regex: escape(q), $options: "i" } }));
      if (params.get("status")) filter.status = params.get("status");
      const collection = database.collection(
        route[0] === "stock" ? "stockMovements" : route[0],
      );
      const [items, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * 15)
          .limit(15)
          .toArray(),
        collection.countDocuments(filter),
      ]);
      return json({
        items,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / 15)),
      });
    }
  }
  if (method === "POST" || method === "PATCH") {
    await rateLimit(request, admin ? "operations" : "account-changes", 40);
    const input = await body(request);
    if (admin && route[0] === "recovery" && route[1]) {
      z.object({ identityVerified: z.literal(true) }).parse(input);
      const message = await database
        .collection("messages")
        .findOne({ _id: oid(route[1]), kind: "account-recovery" });
      if (!message) throw new HttpError(404, "Recovery request not found.");
      const customer = await database
        .collection("users")
        .findOne({
          _id: oid(message.data.userId),
          role: "customer",
          active: { $ne: false },
        });
      if (!customer)
        throw new HttpError(400, "Customer account is unavailable.");
      const token = randomBytes(32).toString("hex");
      await database
        .collection("passwordResets")
        .deleteMany({ userId: customer._id.toString() });
      await database
        .collection("passwordResets")
        .insertOne({
          tokenHash: createHash("sha256").update(token).digest("hex"),
          userId: customer._id.toString(),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        });
      await audit(
        "customer.recovery-issued",
        customer._id.toString(),
        "Staff confirmed identity and issued a 30-minute reset link",
      );
      return json({ path: `/auth/reset-password#token=${token}` });
    }
    if (!admin && route[0] === "profile") {
      const profile = z
        .object({ name: z.string().trim().min(2).max(180), phone: current.role === "customer" ? bdPhone : bdPhone.or(z.literal("")) })
        .parse(input);
      await database
        .collection("users")
        .updateOne(
          { _id: current._id },
          profile.phone ? { $set: { ...profile, updatedAt: new Date() } }
            : { $set: { name: profile.name, updatedAt: new Date() }, $unset: { phone: "" } },
        );
      return json({ ok: true });
    }
    if (!admin && route[0] === "addresses") {
      const { addresses } = z
        .object({
          addresses: z
            .array(addressSchema)
            .max(10)
            .refine(
              (a) =>
                new Set(a.map((v) => v.id)).size === a.length &&
                a.filter((v) => v.default).length <= 1,
              "Use unique addresses and one default",
            ),
        })
        .parse(input);
      await database
        .collection("users")
        .updateOne({ _id: current._id }, { $set: { addresses } });
      return json({ ok: true });
    }
    if (!admin && route[0] === "wishlist") {
      const { slug, saved } = z
        .object({ slug: z.string().min(1).max(180), saved: z.boolean() })
        .parse(input);
      const existing: string[] = current.wishlist || [];
      if (saved && existing.length >= 100 && !existing.includes(slug))
        throw new HttpError(400, "Your wishlist can hold up to 100 products.");
      await database
        .collection("users")
        .updateOne(
          { _id: current._id },
          saved
            ? { $addToSet: { wishlist: slug } }
            : ({ $pull: { wishlist: slug } } as Document),
        );
      return json({ ok: true });
    }
    if (!admin && route[0] === "cancel") {
      const { orderNo } = z
        .object({ orderNo: z.string().max(60) })
        .parse(input);
      const order = await database
        .collection("orders")
        .findOne({ orderNo, userId });
      if (!order) throw new HttpError(404, "Order not found.");
      await updateOrder(order._id, "cancelled", userId, true);
      return json({ ok: true });
    }
    if (!admin && route[0] === "tickets" && !route[1]) {
      const data = ticketSchema.parse(input);
      if (data.orderNo || ["return", "warranty"].includes(data.kind)) {
        const order = await database
          .collection("orders")
          .findOne({ orderNo: data.orderNo, userId });
        if (!order)
          throw new HttpError(404, "Choose an order from your account.");
        if (
          ["return", "warranty"].includes(data.kind) &&
          order.status !== "delivered"
        )
          throw new HttpError(
            409,
            "Return and warranty requests require a delivered order.",
          );
      }
      const result = await database
        .collection("tickets")
        .insertOne({
          ...data,
          userId,
          customerName: current.name,
          email: current.email,
          status: "open",
          messages: [
            { author: "customer", text: data.message, at: new Date() },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      await audit("ticket.create", result.insertedId.toString(), data.subject);
      return json({ ok: true, id: result.insertedId }, 201);
    }
    if (route[0] === "tickets" && route[1]) {
      const data = z
        .object({
          message: z.string().trim().max(4000).default(""),
          status: z
            .enum([
              "open",
              "in-progress",
              "awaiting-customer",
              "approved",
              "received",
              "resolved",
              "rejected",
            ])
            .optional(),
          refundAmount: z.number().finite().min(0).optional(),
          refundReference: z.string().trim().max(180).optional(),
        })
        .parse(input);
      const filter: Document = {
        _id: oid(route[1]),
        ...(!admin ? { userId } : {}),
      };
      const ticket = await database.collection("tickets").findOne(filter);
      if (!ticket) throw new HttpError(404, "Request not found.");
      if (ticket.messages.length >= 100)
        throw new HttpError(
          409,
          "This conversation is full. Please open a new request.",
        );
      if (["resolved", "rejected"].includes(ticket.status))
        throw new HttpError(
          409,
          "This request is closed. Open a new request if you need more help.",
        );
      if (!admin && (data.status || data.refundAmount !== undefined))
        throw new HttpError(
          403,
          "Only store staff can change the request status.",
        );
      if (
        data.status &&
        data.status !== ticket.status &&
        !ticketTransitions[ticket.status]?.includes(data.status)
      )
        throw new HttpError(409, "Invalid request status transition.");
      const changes: Document = { updatedAt: new Date() };
      if (data.status) changes.status = data.status;
      if (!admin && ticket.status === "awaiting-customer")
        changes.status = "in-progress";
      if (data.refundAmount !== undefined) {
        const order = await database
          .collection("orders")
          .findOne({ orderNo: ticket.orderNo, userId: ticket.userId });
        if (
          ticket.kind !== "return" ||
          ticket.status !== "received" ||
          data.status !== "resolved" ||
          !order ||
          data.refundAmount > order.total ||
          !data.refundReference ||
          !data.message
        )
          throw new HttpError(
            400,
            "Record a completed refund only after receiving a return, with an amount within the order total, payment reference, and reply.",
          );
        // A refund is recorded once per order, atomically with the case resolution.
        const session = (await mongo()).startSession();
        try {
          await session.withTransaction(async () => {
            const result = await database
              .collection("orders")
              .updateOne(
                { _id: order._id, refund: { $exists: false } },
                {
                  $set: {
                    refund: {
                      amount: data.refundAmount,
                      reference: data.refundReference,
                      at: new Date(),
                    },
                    paymentStatus:
                      data.refundAmount === order.total
                        ? "refunded"
                        : "partially-refunded",
                  },
                },
                { session },
              );
            if (!result.modifiedCount)
              throw new HttpError(
                409,
                "A refund has already been recorded for this order.",
              );
            const updated = await database
              .collection("tickets")
              .updateOne(
                { ...filter, status: ticket.status },
                {
                  $set: {
                    ...changes,
                    refundAmount: data.refundAmount,
                    refundReference: data.refundReference,
                  },
                  $push: {
                    messages: {
                      author: "store",
                      text: data.message,
                      at: new Date(),
                    },
                  },
                } as Document,
                { session },
              );
            if (!updated.modifiedCount)
              throw new HttpError(
                409,
                "Request changed. Refresh and try again.",
              );
          });
        } finally {
          await session.endSession();
        }
      } else {
        if (!data.message && !data.status)
          throw new HttpError(400, "Write a reply or choose a status.");
        const result = await database
          .collection("tickets")
          .updateOne({ ...filter, status: ticket.status }, {
            $set: changes,
            ...(data.message
              ? {
                  $push: {
                    messages: {
                      author: admin ? "store" : "customer",
                      text: data.message,
                      at: new Date(),
                    },
                  },
                }
              : {}),
          } as Document);
        if (!result.modifiedCount)
          throw new HttpError(409, "Request changed. Refresh and try again.");
      }
      await audit("ticket.update", route[1], data.status || "Reply sent");
      return json({ ok: true });
    }
    if (admin && route[0] === "shipment" && route[1]) {
      const data = z
        .object({
          courier: z.string().trim().min(1).max(80),
          trackingNumber: z.string().trim().min(1).max(120),
          trackingUrl: z
            .string()
            .url()
            .max(500)
            .refine(
              (v) => v.startsWith("https://"),
              "Use an HTTPS tracking URL",
            )
            .or(z.literal("")),
          note: z.string().max(1500).default(""),
        })
        .parse(input);
      const result = await database
        .collection("orders")
        .updateOne(
          { _id: oid(route[1]), status: { $nin: ["cancelled", "delivered"] } },
          { $set: { shipment: data, updatedAt: new Date() } },
        );
      if (!result.matchedCount)
        throw new HttpError(409, "Shipment details require an open order.");
      await audit(
        "order.shipment",
        route[1],
        `${data.courier}: ${data.trackingNumber}`,
      );
      return json({ ok: true });
    }
    if (admin && route[0] === "stock") {
      const data = z
        .object({
          slug: z.string().min(1).max(180),
          delta: z
            .number()
            .int()
            .min(-100000)
            .max(100000)
            .refine((v) => v !== 0),
          reason: z.string().trim().min(5).max(300),
        })
        .parse(input);
      const session = (await mongo()).startSession();
      try {
        await session.withTransaction(async () => {
          const product = await database
            .collection("products")
            .findOneAndUpdate(
              {
                slug: data.slug,
                stock: {
                  $gte: Math.max(0, -data.delta),
                  $lte: 1000000 - Math.max(0, data.delta),
                },
              },
              { $inc: { stock: data.delta }, $set: { updatedAt: new Date() } },
              { session, returnDocument: "after" },
            );
          if (!product)
            throw new HttpError(
              409,
              "Product not found or adjustment would exceed inventory limits.",
            );
          await database
            .collection("products")
            .updateOne(
              { _id: product._id },
              {
                $set: {
                  inStock:
                    product.stock > 0 && !product.isTba && !product.endOfLife,
                },
              },
              { session },
            );
          await database
            .collection("stockMovements")
            .insertOne(
              {
                ...data,
                balance: product.stock,
                actorId: userId,
                createdAt: new Date(),
              },
              { session },
            );
          await database
            .collection("audit")
            .insertOne(
              {
                action: "stock.adjust",
                entityId: product._id.toString(),
                detail: `${data.delta}: ${data.reason}`,
                actorId: userId,
                createdAt: new Date(),
              },
              { session },
            );
        });
      } finally {
        await session.endSession();
      }
      return json({ ok: true });
    }
    if (admin && route[0] === "customers" && route[1]) {
      const data = z
        .object({
          notes: z.string().max(5000),
          tags: z.array(z.string().trim().min(1).max(40)).max(10),
        })
        .parse(input);
      const result = await database
        .collection("users")
        .updateOne({ _id: oid(route[1]), role: "customer" }, { $set: data });
      if (!result.matchedCount) throw new HttpError(404, "Customer not found.");
      await audit(
        "customer.notes",
        route[1],
        "Customer notes and tags updated",
      );
      return json({ ok: true });
    }
    if (!admin && route[0] === "reviews") {
      const data = z
        .object({
          slug: z.string().min(1).max(180),
          rating: z.number().int().min(1).max(5),
          comment: z.string().trim().min(10).max(2000),
        })
        .parse(input);
      const purchased = await database
        .collection("orders")
        .findOne({ userId, status: "delivered", "items.slug": data.slug });
      if (!purchased)
        throw new HttpError(
          403,
          "Reviews are available after your purchase is delivered.",
        );
      await database
        .collection("reviews")
        .updateOne(
          { userId, slug: data.slug },
          {
            $set: {
              ...data,
              customerName: current.name,
              status: "pending",
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        );
      return json({ ok: true });
    }
    if (admin && route[0] === "reviews" && route[1]) {
      const { status } = z
        .object({ status: z.enum(["approved", "rejected"]) })
        .parse(input);
      const result = await database
        .collection("reviews")
        .updateOne({ _id: oid(route[1]) }, { $set: { status } });
      if (!result.matchedCount) throw new HttpError(404, "Review not found.");
      await audit("review.moderate", route[1], status);
      return json({ ok: true });
    }
  }
  throw new HttpError(404, "Endpoint not found.");
}
