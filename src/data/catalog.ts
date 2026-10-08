import "server-only";

// Local mock catalogue. Everything here is generated from the HTTrack snapshot by
// `npm run extract` (see scripts/extract). Only src/services/* should import this module;
// pages and components go through the services so a real API can replace it later.
import productsJson from "./generated/products.json";
import detailsJson from "./generated/product-details.json";
import categoriesJson from "./generated/categories.json";
import brandsJson from "./generated/brands.json";
import listingsJson from "./generated/listings.json";
import homeJson from "./generated/home.json";
import showcasesJson from "./generated/showcases.json";
import offersJson from "./generated/offers.json";
import storesJson from "./generated/stores.json";
import blogsJson from "./generated/blogs.json";
import siteJson from "./generated/site.json";
import pageMetaJson from "./generated/page-meta.json";
import policiesJson from "./generated/policies.json";
import postsJson from "./generated/posts.json";

import type {
  BlogPost,
  Brand,
  BrandListing,
  Campaign,
  CampaignDetail,
  Category,
  ExploreCategory,
  HomeContent,
  ListingMeta,
  Product,
  ProductDetail,
  Showcase,
  SiteSettings,
  Store,
  StoreDistrict,
  SubCategoryListing,
} from "@/types";

export const products = productsJson as unknown as Product[];
export const productDetails = detailsJson as unknown as Record<string, ProductDetail>;
export const categories = (categoriesJson as unknown as { categories: Category[] }).categories;
export const exploreAll = (categoriesJson as unknown as { exploreAll: ExploreCategory[] }).exploreAll;
export const brands = brandsJson as unknown as Brand[];
export const listings = listingsJson as unknown as {
  categories: Record<string, ListingMeta>;
  subCategories: Record<string, SubCategoryListing>;
  brands: Record<string, BrandListing>;
};
export const home = homeJson as unknown as HomeContent;
export const showcases = showcasesJson as unknown as Record<string, Showcase>;
export const offers = offersJson as unknown as { campaigns: Campaign[]; details: Record<string, CampaignDetail> };
export const stores = storesJson as unknown as { districts: StoreDistrict[]; items: Store[] };
export const blogs = blogsJson as unknown as { total: number; categories: string[]; posts: BlogPost[] };
export const site = siteJson as unknown as SiteSettings;
export const pageMeta = pageMetaJson as unknown as Record<string, { title: string; description: string; keywords: string }>;
export const posts = postsJson as unknown as { careers: BlogPost[]; announcements: BlogPost[] };
export const policies = policiesJson as unknown as Record<string, { endpoint: string; title: string }>;

export const productBySlug = new Map(products.map((p) => [p.slug, p]));
export const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
