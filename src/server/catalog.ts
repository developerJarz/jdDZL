import type { Document } from "mongodb";
import type { BlogPost, Brand, Category, HomeContent, Product, SiteSettings } from "@/types";
import { db } from "./db";
import { brands, categories, home, products, site } from "@/data/catalog";
import { resolveHomeSections, type HomeSection } from "@/lib/home-sections";
import { cache } from "react";

export const liveProducts = cache(async (): Promise<Product[]> => {
  if (!process.env.MONGODB_URI) return products;
  const rows = await (
    await db()
  )
    .collection("products")
    .find(
      { active: { $ne: false } },
      {
        projection: {
          _id: 0,
          stock: 0,
          active: 0,
          costPrice: 0,
          "variantStock.cost": 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    )
    .toArray();
  return rows as unknown as Product[];
});

/**
 * Categories managed in the dashboard. Hidden categories are excluded. The snapshot is only
 * used before `npm run db:setup` has imported the taxonomy (an empty collection).
 */
export const liveCategories = cache(async (): Promise<Category[]> => {
  if (!process.env.MONGODB_URI) return categories;
  const rows = await (await db())
    .collection("categories")
    .find({}, { projection: { _id: 0, createdAt: 0, updatedAt: 0 } })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();
  if (!rows.length) return categories;
  return rows.filter((c) => c.active !== false) as unknown as Category[];
});

export const liveBrands = cache(async (): Promise<Brand[]> => {
  if (!process.env.MONGODB_URI) return brands;
  const rows = await (await db())
    .collection("brands")
    .find({}, { projection: { _id: 0, createdAt: 0, updatedAt: 0 } })
    .sort({ name: 1 })
    .toArray();
  if (!rows.length) return brands;
  return rows.filter((b) => b.active !== false) as unknown as Brand[];
});

export const liveHome = cache(
  async (): Promise<HomeContent & { sections: HomeSection[] }> => {
    const stored: Document =
      (process.env.MONGODB_URI
        ? await (await db()).collection("content").findOne({ key: "home" })
        : null) ?? {};
    const { _id, key, updatedAt, ...rest } = stored;
    void _id;
    void key;
    void updatedAt;
    const merged = { ...home, ...rest } as HomeContent & { sections?: HomeSection[] };
    return { ...merged, sections: resolveHomeSections(merged.sections) };
  },
);

export const liveSettings = cache(async (): Promise<SiteSettings> => {
  if (!process.env.MONGODB_URI) return site;
  const settings = await (
    await db()
  )
    .collection("settings")
    .findOne({ key: "store" });
  return {
    ...site,
    name: settings?.name ?? site.name,
    phone: settings?.phone ?? site.phone,
    email: settings?.email ?? site.email,
    address: settings?.address ?? site.address,
    // Links set in the dashboard replace the imported ones; empty fields hide that network.
    social: settings?.social ? Object.fromEntries(Object.entries(settings.social).filter(([, v]) => v)) : site.social,
  };
});

/** Blog posts managed in the dashboard (imported from the snapshot by db:setup). */
export const livePosts = cache(async (): Promise<BlogPost[] | null> => {
  if (!process.env.MONGODB_URI) return null;
  const rows = await (await db())
    .collection("posts")
    .find({ active: { $ne: false } }, { projection: { _id: 0, content: 0, createdAt: 0, updatedAt: 0 } })
    .sort({ date: -1 })
    .toArray();
  if (!rows.length && !(await (await db()).collection("posts").estimatedDocumentCount())) return null;
  return rows.map((p) => ({ ...p, date: p.date instanceof Date ? p.date.toISOString().slice(0, 10) : p.date })) as unknown as BlogPost[];
});

export interface CmsPage {
  title: string;
  slug: string;
  html: string;
  showInFooter: boolean;
  seo?: { title: string; description: string };
}

export const livePages = cache(async (): Promise<CmsPage[]> => {
  if (!process.env.MONGODB_URI) return [];
  return (await (await db())
    .collection("pages")
    .find({ active: { $ne: false } }, { projection: { _id: 0, title: 1, slug: 1, html: 1, showInFooter: 1, seo: 1 } })
    .sort({ title: 1 })
    .toArray()) as unknown as CmsPage[];
});

export const liveLanding = cache(async (slug: string) => {
  if (!process.env.MONGODB_URI) return null;
  return (await db()).collection("landingPages").findOne({ slug, active: { $ne: false } }, { projection: { _id: 0 } });
});

/** Public marketing settings: social links and tracking IDs (never secrets). */
export const liveMarketing = cache(async () => {
  if (!process.env.MONGODB_URI) return { social: {} as Record<string, string>, tracking: { pixelId: "", gtmId: "" } };
  const s = await (await db()).collection("settings").findOne({ key: "store" }, { projection: { social: 1, tracking: 1 } });
  return { social: (s?.social ?? {}) as Record<string, string>, tracking: { pixelId: s?.tracking?.pixelId ?? "", gtmId: s?.tracking?.gtmId ?? "" } };
});
