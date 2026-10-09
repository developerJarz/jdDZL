import { ObjectId, type Db, type Document } from "mongodb";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, mongo } from "./db";
import { requireUser } from "./auth";
import { body, HttpError, json, sameOrigin } from "./http";
import {
  brandSchema,
  categorySchema,
  homeSchema,
  productBulkSchema,
  type ProductInput,
} from "./schemas";
import { defaultHomeSections, resolveHomeSections } from "@/lib/home-sections";
import { home as homeSnapshot } from "@/data/catalog";
import { cleanHomeContent } from "./content-brand";
import { can, type StaffUser } from "@/lib/permissions";

const oid = (value: string | undefined) => {
  if (!/^[a-f0-9]{24}$/i.test(value || ""))
    throw new HttpError(400, "Invalid record ID.");
  return new ObjectId(value);
};

/** Storefront-facing fields derived from a validated product payload. */
export function productFields(p: ProductInput, existing?: Document | null) {
  const { imageSrc, images: gallery, ...fields } = p;
  const legacy = imageSrc ? { src: imageSrc, width: null, height: null } : null;
  const images = gallery
    ? gallery
    : legacy
      ? existing?.image?.src === legacy.src && existing?.images?.length
        ? existing.images
        : [legacy]
      : [];
  const recognitionBadge = p.isTba
    ? "Coming Soon"
    : p.endOfLife
      ? "Discontinued"
      : (p.recognitionBadge ??
        (["Coming Soon", "Discontinued"].includes(existing?.recognitionBadge)
          ? ""
          : (existing?.recognitionBadge ?? "")));
  // With per-variant tracking the product total is the sum of its variant rows.
  const tracked = p.trackVariants && p.variantStock.length > 0;
  const stock = tracked ? p.variantStock.reduce((sum, v) => sum + v.stock, 0) : p.stock;
  return {
    ...fields,
    stock,
    trackVariants: tracked,
    image: images[0] ?? null,
    images,
    recognitionBadge,
    inStock: stock > 0 && !p.isTba && !p.endOfLife,
    discount: p.regularPrice
      ? Math.round((1 - p.price / p.regularPrice) * 100)
      : 0,
  };
}

async function audit(
  database: Db,
  actorId: string,
  action: string,
  entityId: string,
  detail: string,
) {
  await database.collection("audit").insertOne({
    action,
    entityId,
    actorId,
    detail,
    createdAt: new Date(),
  });
}

async function homeDocument(database: Db) {
  const stored: Document =
    (await database.collection("content").findOne({ key: "home" })) ?? {};
  const { _id, key, updatedAt, ...rest } = stored;
  void _id;
  void key;
  return {
    ...cleanHomeContent(homeSnapshot, rest),
    sections: resolveHomeSections(rest.sections),
    updatedAt: updatedAt ?? null,
  };
}

/** Replaces a slug inside the homepage merchandising lists (brand/category renames). */
async function renameInHome(
  database: Db,
  field: "categorySlugs" | "shopByBrandSlugs",
  from: string,
  to: string | null,
) {
  const doc = await database.collection("content").findOne({ key: "home" });
  if (!doc?.[field]?.includes(from)) return;
  const list = (doc[field] as string[])
    .map((s) => (s === from ? to : s))
    .filter((s): s is string => Boolean(s));
  await database
    .collection("content")
    .updateOne({ key: "home" }, { $set: { [field]: list } });
}

export async function adminCatalog(
  request: Request,
  path: string[],
): Promise<Response | null> {
  const [, resource, recordId, extra] = path;
  if (
    ![
      "categories",
      "brands",
      "home",
      "taxonomy",
      "media",
      "badges",
      "products",
    ].includes(resource)
  )
    return null;
  const method = request.method;
  // Plain product list/create/update stay in the main route; only bulk + delete land here.
  if (
    resource === "products" &&
    !(method === "POST" && recordId === "bulk") &&
    method !== "DELETE"
  )
    return null;
  if (resource === "media" && method === "POST") return null;
  if (method !== "GET") sameOrigin(request);
  const current = await requireUser(true);
  const actorId = current._id.toString();
  const database = await db();
  const products = database.collection("products");

  if (method === "GET") {
    if (resource === "badges") {
      const threshold =
        (await database.collection("settings").findOne({ key: "store" }))
          ?.lowStockThreshold ?? 5;
      const [
        pendingOrders,
        newMessages,
        openTickets,
        pendingReviews,
        lowStock,
        outOfStock,
        archived,
        activeProducts,
        incompleteOrders,
      ] = await Promise.all([
        database.collection("orders").countDocuments({ status: "pending" }),
        database.collection("messages").countDocuments({ status: "new" }),
        database
          .collection("tickets")
          .countDocuments({ status: { $in: ["open", "in-progress"] } }),
        database.collection("reviews").countDocuments({ status: "pending" }),
        // A product's own alert level overrides the store-wide threshold.
        products.countDocuments({
          active: { $ne: false },
          stock: { $gt: 0 },
          $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", threshold] }] },
        }),
        products.countDocuments({ active: { $ne: false }, stock: 0 }),
        products.countDocuments({ active: false }),
        products.countDocuments({ active: { $ne: false } }),
        database.collection("incompleteOrders").countDocuments({ status: "new" }),
      ]);
      const staff = current as unknown as StaffUser;
      return json({
        pendingOrders: can(staff, "orders") ? pendingOrders : 0,
        newMessages: can(staff, "engagement") ? newMessages : 0,
        openTickets: can(staff, "engagement") ? openTickets : 0,
        pendingReviews: can(staff, "engagement") ? pendingReviews : 0,
        lowStock: can(staff, "inventory") || can(staff, "products") ? lowStock : 0,
        outOfStock: can(staff, "inventory") || can(staff, "products") ? outOfStock : 0,
        archived: can(staff, "products") ? archived : 0,
        activeProducts: can(staff, "products") || can(staff, "inventory") ? activeProducts : 0,
        incompleteOrders: can(staff, "orders") ? incompleteOrders : 0,
      });
    }
    if (resource === "taxonomy") {
      const [categories, brands] = await Promise.all([
        database
          .collection("categories")
          .find(
            {},
            {
              projection: {
                slug: 1,
                name: 1,
                image: 1,
                active: 1,
                "subCategories.slug": 1,
                "subCategories.name": 1,
                "subCategories.children.slug": 1,
                "subCategories.children.name": 1,
              },
            },
          )
          .sort({ sortOrder: 1, name: 1 })
          .toArray(),
        database
          .collection("brands")
          .find({}, { projection: { slug: 1, name: 1, logo: 1, active: 1 } })
          .sort({ name: 1 })
          .toArray(),
      ]);
      return json({ categories, brands });
    }
    if (resource === "categories" || resource === "brands") {
      const field = resource === "categories" ? "$categorySlugs" : "$brandSlug";
      const [items, counts] = await Promise.all([
        database
          .collection(resource)
          .find(recordId ? { _id: oid(recordId) } : {})
          .sort(resource === "categories" ? { sortOrder: 1, name: 1 } : { name: 1 })
          .toArray(),
        products
          .aggregate([
            ...(resource === "categories" ? [{ $unwind: field }] : []),
            {
              $group: {
                _id: field,
                total: { $sum: 1 },
                active: { $sum: { $cond: [{ $ne: ["$active", false] }, 1, 0] } },
                inStock: { $sum: { $cond: [{ $gt: ["$stock", 0] }, 1, 0] } },
              },
            },
          ])
          .toArray(),
      ]);
      const bySlug = new Map(counts.map((c) => [c._id, c]));
      const rows = items.map((item) => ({
        ...item,
        productCount: bySlug.get(item.slug)?.total ?? 0,
        activeCount: bySlug.get(item.slug)?.active ?? 0,
        inStockCount: bySlug.get(item.slug)?.inStock ?? 0,
      }));
      if (recordId) {
        if (!rows[0]) throw new HttpError(404, "Record not found.");
        return json({ item: rows[0] });
      }
      return json({ items: rows, total: rows.length });
    }
    if (resource === "home") return json({ home: await homeDocument(database) });
    if (resource === "media") {
      const params = new URL(request.url).searchParams;
      const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
      const limit = 40;
      const [items, total] = await Promise.all([
        database
          .collection("media")
          .find({}, { projection: { data: 0 } })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        database.collection("media").countDocuments(),
      ]);
      return json({
        items: items.map((m) => ({
          ...m,
          src: `/api/commerce/media/${m._id}`,
        })),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      });
    }
    throw new HttpError(404, "Endpoint not found.");
  }

  if (method === "DELETE") {
    const detach = new URL(request.url).searchParams.get("detach") === "1";
    if (resource === "products") {
      const id = oid(recordId);
      const product = await products.findOne({ _id: id });
      if (!product) throw new HttpError(404, "Product not found.");
      if (
        await database
          .collection("orders")
          .findOne({ "items.slug": product.slug }, { projection: { _id: 1 } })
      )
        throw new HttpError(
          409,
          "This product appears in orders, so it can only be archived.",
        );
      await products.deleteOne({ _id: id });
      await audit(database, actorId, "products.delete", recordId, product.name);
      return json({ ok: true });
    }
    if (resource === "categories" || resource === "brands") {
      const id = oid(recordId);
      const doc = await database.collection(resource).findOne({ _id: id });
      if (!doc) throw new HttpError(404, "Record not found.");
      const filter =
        resource === "categories"
          ? { categorySlugs: doc.slug }
          : { brandSlug: doc.slug };
      const used = await products.countDocuments(filter);
      if (used && !detach)
        throw new HttpError(
          409,
          `${used} product${used === 1 ? " uses" : "s use"} this ${resource === "categories" ? "category" : "brand"}. Hide it instead, or delete and detach it from those products.`,
        );
      if (resource === "categories") {
        await products.updateMany(filter, {
          $pull: {
            categorySlugs: doc.slug,
            subCategorySlugs: {
              $in: (doc.subCategories ?? []).map((s: { slug: string }) => s.slug),
            },
          },
          $set: { updatedAt: new Date() },
        } as Document);
        await renameInHome(database, "categorySlugs", doc.slug, null);
      } else {
        await products.updateMany(filter, {
          $set: { brandSlug: null, brandName: null, updatedAt: new Date() },
        });
        await database
          .collection("categories")
          .updateMany({ brands: doc.slug }, { $pull: { brands: doc.slug } } as Document);
        await renameInHome(database, "shopByBrandSlugs", doc.slug, null);
      }
      await database.collection(resource).deleteOne({ _id: id });
      await audit(
        database,
        actorId,
        `${resource}.delete`,
        recordId,
        `${doc.name}${used ? ` (detached from ${used} products)` : ""}`,
      );
      return json({ ok: true });
    }
    if (resource === "media") {
      const id = oid(recordId);
      const src = `/api/commerce/media/${recordId}`;
      const [inProducts, inCategories, inBrands, homeDoc] = await Promise.all([
        products.countDocuments({ "images.src": src }),
        database.collection("categories").countDocuments({
          $or: [{ "image.src": src }, { "subCategories.image.src": src }],
        }),
        database.collection("brands").countDocuments({ "logo.src": src }),
        database.collection("content").findOne({ key: "home" }),
      ]);
      if (
        inProducts ||
        inCategories ||
        inBrands ||
        JSON.stringify(homeDoc ?? {}).includes(src)
      )
        throw new HttpError(
          409,
          "This image is still used by a product, category, brand, or the homepage.",
        );
      await database.collection("media").deleteOne({ _id: id });
      await audit(database, actorId, "media.delete", recordId, "Image removed");
      return json({ ok: true });
    }
    throw new HttpError(404, "Endpoint not found.");
  }

  const input = await body(request);

  if (resource === "products" && recordId === "bulk") {
    const data = productBulkSchema.parse(input);
    const ids = data.ids.map((v) => new ObjectId(v));
    const filter = { _id: { $in: ids } };
    let affected = 0;
    let skipped = 0;
    if (data.action === "publish" || data.action === "archive") {
      affected = (
        await products.updateMany(filter, {
          $set: { active: data.action === "publish", updatedAt: new Date() },
        })
      ).modifiedCount;
    } else if (data.action === "delete") {
      const rows = await products
        .find(filter, { projection: { slug: 1 } })
        .toArray();
      const ordered = new Set(
        (
          await database
            .collection("orders")
            .distinct("items.slug", {
              "items.slug": { $in: rows.map((r) => r.slug) },
            })
        ).map(String),
      );
      const deletable = rows.filter((r) => !ordered.has(r.slug)).map((r) => r._id);
      skipped = rows.length - deletable.length;
      affected = deletable.length
        ? (await products.deleteMany({ _id: { $in: deletable } })).deletedCount
        : 0;
    } else if (data.action === "add-category" || data.action === "remove-category") {
      if (!data.category) throw new HttpError(400, "Choose a category.");
      affected = (
        await products.updateMany(
          filter,
          data.action === "add-category"
            ? { $addToSet: { categorySlugs: data.category }, $set: { updatedAt: new Date() } }
            : ({ $pull: { categorySlugs: data.category }, $set: { updatedAt: new Date() } } as Document),
        )
      ).modifiedCount;
    } else if (data.action === "set-brand") {
      const brand = data.brandSlug
        ? await database.collection("brands").findOne({ slug: data.brandSlug })
        : null;
      if (data.brandSlug && !brand) throw new HttpError(400, "Brand not found.");
      affected = (
        await products.updateMany(filter, {
          $set: {
            brandSlug: brand?.slug ?? null,
            brandName: brand?.name ?? null,
            updatedAt: new Date(),
          },
        })
      ).modifiedCount;
    }
    await audit(
      database,
      actorId,
      `products.bulk-${data.action}`,
      "bulk",
      `${affected} products${skipped ? `, ${skipped} skipped (ordered products can only be archived)` : ""}`,
    );
    return json({ ok: true, affected, skipped });
  }

  if (resource === "categories" && recordId === "reorder") {
    const { ids } = z
      .object({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(500) })
      .parse(input);
    if (ids.length)
      await database.collection("categories").bulkWrite(
        ids.map((id, i) => ({
          updateOne: { filter: { _id: new ObjectId(id) }, update: { $set: { sortOrder: i } } },
        })),
      );
    await audit(database, actorId, "categories.reorder", "categories", `${ids.length} categories`);
    return json({ ok: true });
  }

  if (resource === "categories") {
    const data = categorySchema.parse(input);
    data.subCategories = data.subCategories.map((s) => ({ ...s, id: s.id || randomUUID() }));
    const collection = database.collection("categories");
    if (method === "POST" && !recordId) {
      const last = await collection.find().sort({ sortOrder: -1 }).limit(1).next();
      const result = await collection.insertOne({
        ...data,
        id: randomUUID(),
        sortOrder: (last?.sortOrder ?? -1) + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await audit(database, actorId, "categories.create", result.insertedId.toString(), data.name);
      return json({ ok: true, id: result.insertedId, slug: data.slug, name: data.name }, 201);
    }
    if (method !== "PATCH") throw new HttpError(405, "Method not allowed.");
    const id = oid(recordId);
    const existing = await collection.findOne({ _id: id });
    if (!existing) throw new HttpError(404, "Category not found.");
    const session = (await mongo()).startSession();
    try {
      await session.withTransaction(async () => {
        await collection.updateOne(
          { _id: id },
          { $set: { ...data, updatedAt: new Date() } },
          { session },
        );
        if (existing.slug !== data.slug)
          await products.updateMany(
            { categorySlugs: existing.slug },
            { $set: { "categorySlugs.$": data.slug } },
            { session },
          );
        const before = new Map(
          (existing.subCategories ?? []).map((s: { id: string; slug: string }) => [s.id, s.slug]),
        );
        for (const sub of data.subCategories) {
          const old = before.get(sub.id);
          if (old && old !== sub.slug)
            await products.updateMany(
              { categorySlugs: data.slug, subCategorySlugs: old },
              { $set: { "subCategorySlugs.$": sub.slug } },
              { session },
            );
        }
      });
    } finally {
      await session.endSession();
    }
    if (existing.slug !== data.slug)
      await renameInHome(database, "categorySlugs", existing.slug, data.slug);
    await audit(database, actorId, "categories.update", recordId, data.name);
    return json({ ok: true });
  }

  if (resource === "brands") {
    const data = brandSchema.parse(input);
    const collection = database.collection("brands");
    if (method === "POST" && !recordId) {
      const result = await collection.insertOne({
        ...data,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await audit(database, actorId, "brands.create", result.insertedId.toString(), data.name);
      return json({ ok: true, id: result.insertedId, slug: data.slug, name: data.name }, 201);
    }
    if (method !== "PATCH") throw new HttpError(405, "Method not allowed.");
    const id = oid(recordId);
    const existing = await collection.findOne({ _id: id });
    if (!existing) throw new HttpError(404, "Brand not found.");
    await collection.updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
    if (existing.slug !== data.slug || existing.name !== data.name) {
      await products.updateMany(
        { brandSlug: existing.slug },
        { $set: { brandSlug: data.slug, brandName: data.name, updatedAt: new Date() } },
      );
      if (existing.slug !== data.slug) {
        await database
          .collection("categories")
          .updateMany({ brands: existing.slug }, { $set: { "brands.$": data.slug } });
        await renameInHome(database, "shopByBrandSlugs", existing.slug, data.slug);
      }
    }
    await audit(database, actorId, "brands.update", recordId, data.name);
    return json({ ok: true });
  }

  if (resource === "home" && method === "PATCH") {
    const data = homeSchema.parse(input);
    await database.collection("content").updateOne(
      { key: "home" },
      {
        $set: { ...data, updatedAt: new Date() },
        $setOnInsert: {
          latestBlogs: homeSnapshot.latestBlogs,
          seoCards: homeSnapshot.seoCards,
        },
      },
      { upsert: true },
    );
    await audit(database, actorId, "home.update", "home", "Homepage layout published");
    return json({ ok: true, home: await homeDocument(database) });
  }
  if (resource === "home" && method === "POST" && recordId === "reset") {
    await database.collection("content").updateOne(
      { key: "home" },
      { $set: { ...homeSnapshot, sections: defaultHomeSections(), updatedAt: new Date() } },
      { upsert: true },
    );
    await audit(database, actorId, "home.reset", "home", "Homepage restored to the original layout");
    return json({ ok: true, home: await homeDocument(database) });
  }
  void extra;
  throw new HttpError(404, "Endpoint not found.");
}
