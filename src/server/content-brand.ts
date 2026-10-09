import { createHash } from "node:crypto";
import manifest from "../data/content/import-manifest.json" with { type: "json" };

/** Compare content only; IDs, orders, prices, stock and account records stay intact. */
export const contentHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value) ?? "").digest("hex");

export const importedSite = manifest.site;
export const importedHome = manifest.home as Record<string, string>;
export const importedCategoryNames: Record<string, string> = {
  phones: "Phones", tablet: "Tablet", laptop: "Laptop", "smart-watch": "Smart Watch",
  gadget: "Gadget", accessories: "Accessories", sounds: "Sounds", "smart-tv": "Smart TV",
  "home-appliance": "Home Appliance", monitor: "Monitor",
};
const importedPosts = new Map(manifest.posts.map(p => [p.slug, p]));
const importedProducts = new Map(manifest.products.map(p => [p.slug, p]));

export function isImportedPost(post: Record<string, unknown>) {
  const original = importedPosts.get(typeof post.slug === "string" ? post.slug : "");
  if (!original) return false;
  return matchesImportedPost(post, original);
}

export function matchesImportedPost(post: Record<string, unknown>, original: { title: string; contentHtml: string | null }) {
  return post.contentHtml
    ? Boolean(original.contentHtml && contentHash(post.contentHtml) === original.contentHtml)
    : contentHash(post.title) === original.title;
}

export function isImportedProductField(slug: string, field: "description" | "shortDescription" | "seo", value: unknown) {
  const original = importedProducts.get(slug);
  return Boolean(original?.[field] && contentHash(value) === original[field]);
}

export function isImportedBadge(slug: string, field: "badge" | "recognitionBadge", value: string) {
  return importedProducts.get(slug)?.[field] === value;
}

export function cleanStoreIdentity(settings: Record<string, unknown> | { name?: string; phone?: string; email?: string; address?: string; social?: Record<string, string> }) {
  const text = (key: "name" | "phone" | "email" | "address") => typeof settings[key] === "string" ? settings[key] as string : "";
  const social = settings.social && typeof settings.social === "object" ? settings.social : {};
  return {
    name: text("name") && text("name") !== importedSite.name ? text("name") : "dazzle.bd",
    phone: text("phone") !== importedSite.phone ? text("phone") : "",
    email: text("email") !== importedSite.email ? text("email") : "",
    address: text("address") !== importedSite.address ? text("address") : "",
    social: Object.fromEntries(Object.entries(social).filter(([key, value]) =>
      typeof value === "string" && value && value !== (importedSite.social as Record<string, string>)[key],
    )),
  };
}

export function cleanHomeContent<T extends object>(fallback: T, stored: Record<string, unknown>): T {
  const current = Object.fromEntries(Object.entries(stored).filter(([field, value]) => {
    if (importedHome[field] === contentHash(value)) return false;
    if (["heroSlides", "offerBanners"].includes(field) && /\/images\/banners\//.test(JSON.stringify(value))) return false;
    return true;
  }));
  return { ...fallback, ...current };
}
