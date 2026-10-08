import { Binary, ObjectId, type Document } from "mongodb";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db, mongo } from "@/server/db";
import { authorizeAdmin, endSession, requireUser, startSession, user } from "@/server/auth";
import {
  body,
  handle,
  HttpError,
  json,
  rateLimit,
  sameOrigin,
} from "@/server/http";
import {
  checkoutSchema,
  couponSchema,
  orderStatus,
  productSchema,
  settingsSchema,
} from "@/server/schemas";
import { quote, updateOrder } from "@/server/orders";
import { customerApi } from "@/server/customer-api";
import { recovery } from "@/server/recovery";
import { adminCatalog, productFields } from "@/server/admin-catalog";
import { overview } from "@/server/admin-overview";
import { adminOps, handlesAdminOps } from "@/server/admin-ops";
import { publicApi } from "@/server/public-api";

export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
const id = (value: string) => {
  if (!/^[a-f0-9]{24}$/i.test(value))
    throw new HttpError(400, "Invalid record ID.");
  return new ObjectId(value);
};
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const resources = [
  "products",
  "orders",
  "customers",
  "coupons",
  "messages",
  "subscribers",
  "audit",
];

export async function GET(request: Request, context: Context) {
  return handle(async () => {
    const path = (await context.params).path;
    if (path[0] === "admin") {
      const staff = await authorizeAdmin(path.slice(1), "GET");
      if (handlesAdminOps(path, "GET")) {
        const handled = await adminOps(request, path, staff as Parameters<typeof adminOps>[2]);
        if (handled) return handled;
        throw new HttpError(404, "Endpoint not found.");
      }
    } else {
      const handled = await publicApi(request, path);
      if (handled) return handled;
    }
    if (
      path[0] === "account" ||
      (path[0] === "admin" && path[1] === "operations")
    )
      return customerApi(request, path);
    if (path[0] === "admin") {
      const handled = await adminCatalog(request, path);
      if (handled) return handled;
    }
    if (path[0] === "reviews" && path[1]) {
      return json({
        items: await (
          await db()
        )
          .collection("reviews")
          .find(
            { slug: path[1], status: "approved" },
            {
              projection: {
                customerName: 1,
                rating: 1,
                comment: 1,
                createdAt: 1,
              },
            },
          )
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray(),
      });
    }
    if (path[0] === "media" && path[1]) {
      const image = await (
        await db()
      )
        .collection("media")
        .findOne({ _id: id(path[1]) });
      if (!image) throw new HttpError(404, "Image not found.");
      return new Response(new Uint8Array(image.data.buffer), {
        headers: {
          "Content-Type": image.mime,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (path.join("/") === "health") {
      await (await db()).command({ ping: 1 });
      return json({ ok: true, database: "connected" });
    }
    if (path.join("/") === "auth/me") {
      const current = await user();
      return json({
        user: current
          ? {
              _id: current._id,
              name: current.name,
              email: current.email,
              phone: current.phone,
              role: current.role,
              permissions: current.permissions || [],
              staffRole: current.staffRole || "",
              addresses: current.addresses || [],
              wishlist: current.wishlist || [],
            }
          : null,
      });
    }
    const current = await requireUser(path[0] === "admin");
    const database = await db();
    if (path[0] === "orders") {
      const filter: Document = { userId: current._id.toString() };
      if (path[1]) filter.orderNo = path[1].toUpperCase();
      return json({
        items: await database
          .collection("orders")
          .find(filter)
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray(),
      });
    }
    if (path[0] !== "admin") throw new HttpError(404, "Endpoint not found.");
    const resource = path[1];
    if (resource === "settings")
      return json({
        settings: await database
          .collection("settings")
          .findOne({ key: "store" }),
      });
    if (resource === "overview")
      return json(
        await overview(
          database,
          Number(new URL(request.url).searchParams.get("days")) || 30,
        ),
      );
    if (!resources.includes(resource))
      throw new HttpError(404, "Resource not found.");
    if (resource === "products" && path[2]) {
      const item = await database
        .collection("products")
        .findOne({ _id: id(path[2]) });
      if (!item) throw new HttpError(404, "Product not found.");
      const ordered = await database
        .collection("orders")
        .countDocuments({ "items.slug": item.slug });
      return json({ item, ordered });
    }
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(params.get("limit")) || 15)),
    );
    const filter: Document = {};
    if (resource === "customers") filter.role = "customer";
    const q = params.get("q")?.trim().slice(0, 100);
    if (q) {
      const fields =
        resource === "orders"
          ? ["orderNo", "customer.name", "customer.email", "customer.phone"]
          : resource === "coupons"
            ? ["code"]
            : resource === "messages"
              ? ["kind", "data.name", "data.email", "data.message"]
              : resource === "audit"
                ? ["action", "detail"]
                : ["name", "email", "code", "slug"];
      filter.$or = fields.map((field) => ({
        [field]: { $regex: escapeRegex(q), $options: "i" },
      }));
    }
    if (resource === "orders" && params.get("status"))
      filter.status = orderStatus.parse(params.get("status"));
    if (resource === "products" && params.get("status") === "low") {
      const threshold =
        (await database.collection("settings").findOne({ key: "store" }))
          ?.lowStockThreshold ?? 5;
      filter.stock = { $gt: 0 };
      filter.$expr = {
        $lte: ["$stock", { $ifNull: ["$lowStockThreshold", threshold] }],
      };
    }
    if (resource === "orders" && params.get("assigned") === "me")
      filter["assignedTo.id"] = (await user())?._id.toString();
    if (resource === "orders" && params.get("channel"))
      filter.channel =
        params.get("channel") === "web"
          ? { $in: ["web", null] }
          : params.get("channel");
    if (resource === "products" && params.get("barcode"))
      filter.barcode = params.get("barcode");
    if (resource === "products" && params.get("status") === "out")
      filter.stock = 0;
    if (resource === "products" && params.get("status") === "noimage")
      filter.image = null;
    if (resource === "products" && params.get("status") === "noprice") {
      filter.price = { $lte: 0 };
      filter.isTba = { $ne: true };
    }
    if (
      resource === "products" &&
      ["active", "low", "out"].includes(params.get("status") || "")
    )
      filter.active = { $ne: false };
    if (resource === "products" && params.get("status") === "archived")
      filter.active = false;
    if (resource === "products" && params.get("category"))
      filter.categorySlugs =
        params.get("category") === "_none"
          ? { $size: 0 }
          : params.get("category");
    if (resource === "products" && params.get("slugs"))
      filter.slug = {
        $in: (params.get("slugs") || "").split(",").filter(Boolean).slice(0, 100),
      };
    if (resource === "products" && params.get("brand"))
      filter.brandSlug =
        params.get("brand") === "_none" ? null : params.get("brand");
    const sorts: Record<string, Document> = {
      newest: { createdAt: -1, _id: -1 },
      updated: { updatedAt: -1, _id: -1 },
      "name-asc": { name: 1 },
      "price-asc": { price: 1 },
      "price-desc": { price: -1 },
      "stock-asc": { stock: 1, name: 1 },
      "stock-desc": { stock: -1, name: 1 },
    };
    const sort =
      (resource === "products" && sorts[params.get("sort") || ""]) ||
      sorts.newest;
    const collection = database.collection(
      resource === "customers" ? "users" : resource,
    );
    const [items, total, counts] = await Promise.all([
      collection
        .find(filter, { projection: { passwordHash: 0, tokenHash: 0 } })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
      // Per-status totals for the order tabs (ignores the status filter itself).
      resource === "orders"
        ? collection
            .aggregate([
              { $match: { ...filter, status: { $exists: true } } },
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ])
            .toArray()
        : null,
    ]);
    return json({
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      ...(counts
        ? { counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) }
        : {}),
    });
  });
}

export async function POST(request: Request, context: Context) {
  return handle(async () => {
    sameOrigin(request);
    const path = (await context.params).path;
    if (path[0] === "admin") {
      const staff = await authorizeAdmin(path.slice(1), "POST");
      if (handlesAdminOps(path, "POST")) {
        const handled = await adminOps(request, path, staff as Parameters<typeof adminOps>[2]);
        if (handled) return handled;
        throw new HttpError(404, "Endpoint not found.");
      }
    } else {
      const handled = await publicApi(request, path);
      if (handled) return handled;
    }
    const route = path.join("/");
    if (
      path[0] === "account" ||
      (path[0] === "admin" && path[1] === "operations")
    )
      return customerApi(request, path);
    const database = await db();
    if (route === "admin/media") {
      await requireUser(true);
      await rateLimit(request, "media", 20);
      if (Number(request.headers.get("content-length")) > 6_000_000)
        throw new HttpError(413, "Upload an image smaller than 5 MB.");
      const form = await request.formData();
      const file = form.get("image");
      if (!(file instanceof File) || file.size > 5_000_000 || !file.size)
        throw new HttpError(
          400,
          "Choose a PNG, JPEG, or WebP image smaller than 5 MB.",
        );
      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "image/png"
        : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
          ? "image/jpeg"
          : buffer.toString("ascii", 0, 4) === "RIFF" &&
              buffer.toString("ascii", 8, 12) === "WEBP"
            ? "image/webp"
            : null;
      if (!mime)
        throw new HttpError(
          400,
          "Only PNG, JPEG, and WebP images are allowed.",
        );
      // Dimensions are measured by the browser; they only size placeholders, so bad
      // values are discarded rather than rejected.
      const dimension = (key: string) => {
        const n = Number(form.get(key));
        return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null;
      };
      const media = {
        mime,
        size: file.size,
        name: String(file.name || "image").slice(0, 120),
        width: dimension("width"),
        height: dimension("height"),
        createdAt: new Date(),
      };
      const result = await database
        .collection("media")
        .insertOne({ data: new Binary(buffer), ...media });
      return json(
        {
          ok: true,
          id: result.insertedId,
          src: `/api/commerce/media/${result.insertedId}`,
          ...media,
        },
        201,
      );
    }
    if (path[0] === "admin") {
      const handled = await adminCatalog(request, path);
      if (handled) return handled;
    }
    if (route === "auth/logout") {
      await endSession();
      return json({ ok: true });
    }
    if (route === "auth/login") {
      await rateLimit(request, "login", 10);
      const input = z
        .object({
          username: z.string().trim().min(1).max(180),
          password: z.string().min(1).max(72),
        })
        .parse(await body(request));
      const found = await database.collection("users").findOne({
        $or: [
          { email: input.username.toLowerCase() },
          { phone: input.username },
        ],
        active: { $ne: false },
      });
      const valid = await compare(
        input.password,
        found?.passwordHash ||
          "$2b$12$P2Iw7zRuo2oCnwBS.rAkiusBGtj.O2e6Vl3nlAFTaqBX81ieK0ndq",
      );
      if (!found || !valid)
        throw new HttpError(401, "Email or password is incorrect.");
      await endSession();
      await startSession(found._id.toString());
      return json({
        ok: true,
        message: "Signed in successfully.",
        role: found.role,
      });
    }
    if (route === "auth/register") {
      await rateLimit(request, "register", 5);
      const input = z
        .object({
          name: z.string().trim().min(2).max(180),
          email: z
            .string()
            .email()
            .max(180)
            .transform((v) => v.toLowerCase()),
          phone: z.string().regex(/^01[3-9]\d{8}$/),
          password: z.string().min(8).max(72),
        })
        .parse(await body(request));
      const result = await database.collection("users").insertOne({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: await hash(input.password, 12),
        role: "customer",
        active: true,
        createdAt: new Date(),
      });
      await startSession(result.insertedId.toString());
      return json(
        { ok: true, message: "Account created. You can now checkout." },
        201,
      );
    }
    if (route === "auth/password") {
      const current = await requireUser();
      await rateLimit(request, "password", 5);
      const input = z
        .object({
          currentPassword: z.string().max(72),
          password: z.string().min(8).max(72),
        })
        .parse(await body(request));
      const account = await database
        .collection("users")
        .findOne({ _id: current._id });
      if (
        !account ||
        !(await compare(input.currentPassword, account.passwordHash))
      )
        throw new HttpError(400, "Current password is incorrect.");
      await database
        .collection("users")
        .updateOne(
          { _id: current._id },
          { $set: { passwordHash: await hash(input.password, 12) } },
        );
      await database
        .collection("sessions")
        .deleteMany({ userId: current._id.toString() });
      await startSession(current._id.toString());
      return json({
        ok: true,
        message: "Password updated. Other sessions have been signed out.",
      });
    }
    if (route === "auth/forget-password" || route === "auth/reset-password")
      return recovery(request, route === "auth/reset-password");
    if (route === "auth/otp")
      throw new HttpError(
        501,
        "Email/SMS delivery is not configured. Contact the store administrator for account recovery.",
      );
    if (path[0] === "forms") {
      await rateLimit(request, "forms", 10);
      const kind = z
        .enum(["support", "feedback", "corporate", "pre-order"])
        .parse(path[1]);
      const data = z
        .record(z.string().max(5000))
        .refine(
          (v) =>
            Object.keys(v).length <= 20 &&
            Object.values(v).some((s) => s.trim().length > 0),
          "Please provide your details",
        )
        .parse(await body(request));
      if (data.email && !z.string().email().safeParse(data.email).success)
        throw new HttpError(400, "Invalid email address.");
      await database
        .collection("messages")
        .insertOne({ kind, data, status: "new", createdAt: new Date() });
      return json(
        { ok: true, message: "Thank you! Your request has been received." },
        201,
      );
    }
    if (route === "newsletter-subscribe") {
      await rateLimit(request, "newsletter", 10);
      const { email } = z
        .object({
          email: z
            .string()
            .email()
            .max(180)
            .transform((v) => v.toLowerCase()),
        })
        .parse(await body(request));
      await database
        .collection("subscribers")
        .updateOne(
          { email },
          { $set: { active: true }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true },
        );
      return json({ ok: true, message: "Thanks for subscribing!" });
    }
    if (route === "newsletter-unsubscribe") {
      const current = await requireUser();
      await database
        .collection("subscribers")
        .updateOne({ email: current.email }, { $set: { active: false } });
      return json({ ok: true, message: "You have been unsubscribed." });
    }
    if (route === "checkout/quote") {
      await requireUser();
      const input = checkoutSchema
        .pick({ items: true, coupon: true, delivery: true, city: true, zone: true })
        .parse(await body(request));
      return json(await quote(input));
    }
    if (path[0] === "admin" && ["products", "coupons"].includes(path[1])) {
      const current = await requireUser(true);
      const resource = path[1];
      const input =
        resource === "products"
          ? productSchema.parse(await body(request))
          : couponSchema.parse(await body(request));
      let document: Document = {
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (resource === "products") {
        document = {
          ...productFields(productSchema.parse(input)),
          id: new ObjectId().toString(),
          hasDetail: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else document.expiresAt = new Date(document.expiresAt);
      const result = await database.collection(resource).insertOne(document);
      await database.collection("audit").insertOne({
        action: `${resource}.create`,
        entityId: result.insertedId.toString(),
        actorId: current._id.toString(),
        detail: document.name || document.code,
        createdAt: new Date(),
      });
      return json({ ok: true, id: result.insertedId }, 201);
    }
    throw new HttpError(404, "Endpoint not found.");
  });
}

export async function PATCH(request: Request, context: Context) {
  return handle(async () => {
    sameOrigin(request);
    const path = (await context.params).path;
    if (path[0] === "admin") {
      const staff = await authorizeAdmin(path.slice(1), "PATCH");
      if (handlesAdminOps(path, "PATCH")) {
        const handled = await adminOps(request, path, staff as Parameters<typeof adminOps>[2]);
        if (handled) return handled;
        throw new HttpError(404, "Endpoint not found.");
      }
    } else {
      const handled = await publicApi(request, path);
      if (handled) return handled;
    }
    if (
      path[0] === "account" ||
      (path[0] === "admin" && path[1] === "operations")
    )
      return customerApi(request, path);
    const current = await requireUser(true);
    if (path[0] !== "admin") throw new HttpError(404, "Endpoint not found.");
    const handled = await adminCatalog(request, path);
    if (handled) return handled;
    const database = await db();
    const resource = path[1];
    const input = await body(request);
    if (resource === "settings") {
      const settings = settingsSchema.parse(input);
      await database
        .collection("settings")
        .updateOne(
          { key: "store" },
          { $set: { ...settings, updatedAt: new Date() } },
          { upsert: true },
        );
    } else {
      const recordId = id(path[2]);
      if (resource === "orders") {
        await updateOrder(
          recordId,
          z.object({ status: orderStatus }).parse(input).status,
          current._id.toString(),
        );
        return json({ ok: true });
      }
      let changes: Document;
      if (resource === "products") {
        const p = productSchema.parse(input);
        const existing = await database
          .collection("products")
          .findOne({ _id: recordId });
        if (!existing) throw new HttpError(404, "Product not found.");
        changes = productFields(p, existing);
        if (
          existing.slug !== p.slug &&
          (await database
            .collection("orders")
            .findOne(
              { "items.slug": existing.slug },
              { projection: { _id: 1 } },
            ))
        )
          throw new HttpError(
            409,
            "The slug of an ordered product cannot change. Archive it and create a new product if necessary.",
          );
        const { expectedStock } = z
          .object({ expectedStock: z.number().int().min(0).optional() })
          .parse(input);
        if (expectedStock !== undefined && existing.stock !== expectedStock)
          throw new HttpError(
            409,
            "Inventory changed while this editor was open. Close and reopen the product before saving.",
          );
        const session = (await mongo()).startSession();
        try {
          await session.withTransaction(async () => {
            const result = await database
              .collection("products")
              .updateOne(
                {
                  _id: recordId,
                  stock: existing.stock,
                  updatedAt: existing.updatedAt,
                },
                { $set: { ...changes, updatedAt: new Date() } },
                { session },
              );
            if (!result.matchedCount)
              throw new HttpError(
                409,
                "Product changed. Refresh before saving.",
              );
            if (existing.stock !== changes.stock)
              await database
                .collection("stockMovements")
                .insertOne(
                  {
                    slug: p.slug,
                    delta: changes.stock - existing.stock,
                    balance: changes.stock,
                    reason: "Inventory set from product editor",
                    actorId: current._id.toString(),
                    createdAt: new Date(),
                  },
                  { session },
                );
            await database
              .collection("audit")
              .insertOne(
                {
                  action: "products.update",
                  entityId: recordId.toString(),
                  actorId: current._id.toString(),
                  detail: p.name,
                  createdAt: new Date(),
                },
                { session },
              );
          });
        } finally {
          await session.endSession();
        }
        return json({ ok: true });
      } else if (resource === "coupons") {
        const c = couponSchema.parse(input);
        changes = { ...c, expiresAt: new Date(c.expiresAt) };
      } else if (resource === "messages")
        changes = z
          .object({ status: z.enum(["new", "in-progress", "resolved"]) })
          .parse(input);
      else if (resource === "customers" || resource === "subscribers")
        changes = z.object({ active: z.boolean() }).parse(input);
      else throw new HttpError(404, "Resource not found.");
      const result = await database
        .collection(resource === "customers" ? "users" : resource)
        .updateOne(
          {
            _id: recordId,
            ...(resource === "customers" ? { role: "customer" } : {}),
          },
          { $set: { ...changes, updatedAt: new Date() } },
        );
      if (!result.matchedCount) throw new HttpError(404, "Record not found.");
    }
    await database.collection("audit").insertOne({
      action: `${resource}.update`,
      entityId: path[2] || "store",
      actorId: current._id.toString(),
      detail: "Updated from dashboard",
      createdAt: new Date(),
    });
    return json({ ok: true });
  });
}

export async function DELETE(request: Request, context: Context) {
  return handle(async () => {
    sameOrigin(request);
    const path = (await context.params).path;
    if (path[0] === "admin") {
      const staff = await authorizeAdmin(path.slice(1), "DELETE");
      if (handlesAdminOps(path, "DELETE")) {
        const handled = await adminOps(request, path, staff as Parameters<typeof adminOps>[2]);
        if (handled) return handled;
        throw new HttpError(404, "Endpoint not found.");
      }
    } else {
      const handled = await publicApi(request, path);
      if (handled) return handled;
    }
    if (path[0] !== "admin") throw new HttpError(404, "Endpoint not found.");
    const handled = await adminCatalog(request, path);
    if (handled) return handled;
    const current = await requireUser(true);
    if (path[1] !== "coupons") throw new HttpError(404, "Endpoint not found.");
    const database = await db();
    const coupon = await database
      .collection("coupons")
      .findOneAndDelete({ _id: id(path[2]) });
    if (!coupon) throw new HttpError(404, "Coupon not found.");
    await database.collection("audit").insertOne({
      action: "coupons.delete",
      entityId: path[2],
      actorId: current._id.toString(),
      detail: coupon.code,
      createdAt: new Date(),
    });
    return json({ ok: true });
  });
}
