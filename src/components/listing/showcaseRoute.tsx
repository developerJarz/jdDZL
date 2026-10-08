import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getShowcase } from "@/services/catalog";
import { getPageMeta } from "@/services/content";
import { ShowcasePage } from "./ShowcasePage";

// Titles / breadcrumbs from the reference "See all" pages.
export const SHOWCASE_PAGES = {
  "new-arrivals": { crumb: "New Arrivals", title: "New Arrivals", variant: "listing" },
  "hot-deal": { crumb: "Hot Deal", title: "Hot Deal of the Day", variant: "home" },
  "most-popular": { crumb: "Most Popular", title: "Most Popular", variant: "home" },
  "trending-now": { crumb: "Trending Now", title: "Trending Now", variant: "home" },
  "feature-product": { crumb: "Feature Products", title: "Feature Products", variant: "home" },
} as const;

type Slug = keyof typeof SHOWCASE_PAGES;

export async function showcaseMetadata(slug: Slug): Promise<Metadata> {
  const page = SHOWCASE_PAGES[slug];
  const meta = await getPageMeta(`/${slug}`);
  const title = meta?.title && meta.title !== "Dazzle" ? meta.title : `${page.title} | Dazzle`;
  return buildMetadata({ title, description: meta?.description, path: `/${slug}` });
}

export async function ShowcaseRoute({ slug }: { slug: Slug }) {
  const page = SHOWCASE_PAGES[slug];
  const data = await getShowcase(slug);
  if (!data) notFound();
  return <ShowcasePage crumb={page.crumb} title={page.title} products={data.products} variant={page.variant} />;
}
