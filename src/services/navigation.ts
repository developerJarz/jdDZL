import "server-only";

import type { ImageAsset } from "@/types";
import { getBrands, getCategories, getExploreAll } from "./catalog";

export interface NavCategory {
  slug: string;
  name: string;
  image: ImageAsset | null;
  subCategories: { slug: string; name: string; children?: { slug: string; name: string }[] }[];
}

export interface NavExplore {
  slug: string;
  name: string;
  image: ImageAsset | null;
  brands: { slug: string; name: string; logo: ImageAsset | null }[];
}

export interface NavigationData {
  categories: NavCategory[];
  explore: NavExplore[];
}

/** Compact menu data passed to the client-side header (mega menu, explore-all, mobile menu). */
export async function getNavigationData(): Promise<NavigationData> {
  const [categories, explore, brands] = await Promise.all([getCategories(), getExploreAll(), getBrands()]);
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
  return {
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      image: c.image,
      subCategories: c.subCategories.map((s) => ({
        slug: s.slug,
        name: s.name,
        ...(s.children?.length ? { children: s.children.map((k) => ({ slug: k.slug, name: k.name })) } : {}),
      })),
    })),
    explore: explore.map((e) => ({
      slug: e.slug,
      name: e.name,
      image: e.image,
      brands: e.brands
        .map((b) => brandBySlug.get(b))
        .filter((b) => b !== undefined)
        .map((b) => ({ slug: b.slug, name: b.name, logo: b.logo })),
    })),
  };
}
