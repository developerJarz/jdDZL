import "server-only";

import { blogs, offers, pageMeta, policies, posts, stores } from "@/data/catalog";
import type { BlogPost, Campaign, CampaignDetail, HomeContent, SiteSettings, Store, StoreDistrict } from "@/types";
import { liveHome, livePages, livePosts, liveSettings } from "@/server/catalog";
import type { HomeSection } from "@/lib/home-sections";

// API (reference frontend): GET site-settings, GET news-scroll, GET /pages/:endpoint,
// GET /stores?district_id=, POST newsletter-subscribe.

export async function getSiteSettings(): Promise<SiteSettings> {
  return liveSettings();
}

/** Homepage content and section layout, edited in the dashboard's homepage builder. */
export async function getHomeContent(): Promise<HomeContent & { sections: HomeSection[] }> {
  return liveHome();
}

export async function getPageMeta(route: string) {
  return pageMeta[route] ?? null;
}

// ---- blogs ----
/** Blog posts from the dashboard, falling back to the snapshot before db:setup imports them. */
const allPosts = async () => (await livePosts()) ?? blogs.posts;

export async function getBlogPosts(): Promise<{ total: number; categories: string[]; posts: BlogPost[] }> {
  const posts = await allPosts();
  return { total: posts.length, categories: [...new Set(posts.map((p) => p.category).filter(Boolean))], posts: posts.map((p) => ({ ...p, contentHtml: undefined })) };
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return (await allPosts()).find((p) => p.slug === slug) ?? null;
}

export async function getBlogPostsBySlugs(slugs: string[]): Promise<BlogPost[]> {
  const posts = await allPosts();
  const picked = slugs.map((s) => posts.find((p) => p.slug === s)).filter((p): p is BlogPost => Boolean(p));
  // The homepage shows the latest posts when its curated ones were removed.
  return picked.length ? picked : posts.slice(0, slugs.length || 3);
}

/** Every known post (articles missing from the snapshot render a notice). */
export async function getBlogSlugs(): Promise<string[]> {
  return (await allPosts()).map((p) => p.slug);
}

// ---- dashboard CMS pages ----
export async function getCmsPages() {
  return livePages();
}

export async function getCmsPage(slug: string) {
  return (await livePages()).find((p) => p.slug === slug) ?? null;
}

// ---- career / announcement posts ----
export async function getPosts(kind: "careers" | "announcements"): Promise<BlogPost[]> {
  return posts[kind];
}

export async function getPost(kind: "careers" | "announcements", slug: string): Promise<BlogPost | null> {
  return posts[kind].find((p) => p.slug === slug) ?? null;
}

// ---- stores ----
export async function getStores(): Promise<{ districts: StoreDistrict[]; items: Store[] }> {
  return stores;
}

export async function getStore(slug: string): Promise<Store | null> {
  return stores.items.find((s) => s.slug === slug) ?? null;
}

// ---- offers ----
export async function getCampaigns(): Promise<Campaign[]> {
  return offers.campaigns;
}

export async function getCampaign(slug: string): Promise<CampaignDetail | null> {
  if (offers.details[slug]) return offers.details[slug];
  const c = offers.campaigns.find((x) => x.slug === slug);
  return c ? { slug: c.slug, name: c.name, description: c.description, image: c.image, endsAt: c.endsAt, productSlugs: [] } : null;
}

// ---- CMS policy pages ----
export async function getPolicyPages() {
  return policies;
}

/**
 * Policy text is served by the CMS (`GET /pages/:endpoint`) and was not part of the snapshot,
 * so the mock returns null and the page renders an explicit "unavailable offline" notice.
 */
export async function getPolicyContent(endpoint: string): Promise<string | null> {
  // API: GET /pages/${endpoint}
  void endpoint;
  return null;
}
