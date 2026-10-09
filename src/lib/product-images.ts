import policy from "../data/content/product-image-policy.json" with { type: "json" };
import type { ImageAsset } from "@/types";

const removed = new Set<string>(policy.removedImages);
export const PRODUCT_IMAGE_PLACEHOLDER: ImageAsset = {
  src: "/images/brand/product-unavailable.svg", width: 600, height: 600,
};

/** Only retired local photos are blocked; future uploads and remote assets remain usable. */
export function resolveImageAsset(asset: ImageAsset | null | undefined): ImageAsset | null {
  if (!asset) return null;
  const pathname = asset.src.split(/[?#]/, 1)[0];
  return removed.has(pathname) ? null : asset;
}

/** Apply the same image policy to seed data and existing database products without editing stock or variants. */
export function sanitizeProductImages<T>(product: T): T {
  const fields = product as T & { image?: ImageAsset | null; images?: ImageAsset[] };
  const gallery = fields.images || [];
  const images = gallery.some(asset => resolveImageAsset(asset))
    ? gallery.map(asset => resolveImageAsset(asset) || PRODUCT_IMAGE_PLACEHOLDER) : [];
  return { ...product, image: resolveImageAsset(fields.image), images };
}
