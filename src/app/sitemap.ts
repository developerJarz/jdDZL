import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getBrands, getCategories, getSubCategoryParams } from "@/services/catalog";
import { getBlogSlugs, getStores } from "@/services/content";
import { getAllProductSlugs } from "@/services/products";

const STATIC = [
  "/", "/categories", "/brands", "/offer", "/pre-order", "/online-exclusive", "/new-arrivals", "/hot-deal", "/most-popular",
  "/trending-now", "/feature-product", "/blogs", "/shop-location", "/about-us", "/career", "/announcement", "/press-coverage",
  "/support", "/feedback", "/corporate", "/trade-in", "/faq", "/emi-policy", "/terms-conditions", "/privacy-policy",
  "/refund-policy", "/warranty-policy", "/exchange-policy", "/delivery-policy", "/cancellation-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, subs, brands, products, blogs, stores] = await Promise.all([
    getCategories(),
    getSubCategoryParams(),
    getBrands(),
    getAllProductSlugs(),
    getBlogSlugs(),
    getStores(),
  ]);
  const urls = [
    ...STATIC,
    ...categories.map((c) => `/categories/${c.slug}`),
    ...subs.map((s) => `/categories/${s.slug}/${s.sub}`),
    ...brands.map((b) => `/brands/${b.slug}`),
    ...products.map((p) => `/product/${p}`),
    ...blogs.map((b) => `/blogs/${b}`),
    ...stores.items.map((s) => `/shop-location/${s.slug}`),
  ];
  return urls.map((u) => ({ url: new URL(u, SITE_URL).toString() }));
}
